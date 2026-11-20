// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Weave outcome baskets
/// @notice Each token id is a basket of Gemini prediction-market legs. One token
/// pays up to 1 USDC: the sum of the weights of the legs that hit. Every basket
/// is fully collateralized (reserve >= supply x $1 at mint), so redemption never
/// depends on the operator's Gemini hedge.
/// @dev Trust model: the operator posts prices and resolutions. Results are
/// one-shot and carry an evidence string (Gemini resolution data).
contract WeaveBasket is ERC1155, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant ONE = 1e6; // 1 USDC, the max payout per token
    uint16 public constant BPS = 10_000;

    IERC20 public immutable usdc;
    address public operator;

    struct Basket {
        uint16[] weights; // bps, sum to 10_000
        uint8[] results; // 0 open, 1 hit (pays), 2 miss
        uint64 closeTime; // no mints at or after this
        uint64 priceAt; // when the price was posted
        uint32 maxStale; // seconds a posted price stays valid
        uint96 price; // USDC (6 dp) per token, fee included
        uint8 open; // legs still unresolved
        bool exists;
        uint256 supply; // tokens outstanding
        uint256 reserve; // USDC held for this basket
        uint256 payout; // USDC per token once settled
        string meta; // JSON: series and Gemini instrument symbols per leg
    }

    mapping(uint256 => Basket) internal baskets;
    uint256 public nextId = 1;

    event BasketCreated(uint256 indexed id, uint16[] weights, uint64 closeTime, string meta);
    event PricePosted(uint256 indexed id, uint96 price, uint64 at);
    event Minted(uint256 indexed id, address indexed to, uint256 amount, uint256 cost);
    event LegResolved(uint256 indexed id, uint8 indexed leg, bool hit, string evidence);
    event Settled(uint256 indexed id, uint256 payoutPerToken);
    event Redeemed(uint256 indexed id, address indexed from, uint256 amount, uint256 paid);
    event Funded(uint256 indexed id, uint256 amount);
    event Swept(uint256 indexed id, uint256 amount);
    event OperatorChanged(address operator);

    error NotOperator();
    error BadBasket();
    error BadWeights();
    error BadPrice();
    error Closed();
    error StalePrice();
    error Slippage();
    error Undercollateralized();
    error AlreadyResolved();
    error NotSettled();

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    constructor(IERC20 usdc_, address operator_, string memory uri_) ERC1155(uri_) Ownable(msg.sender) {
        usdc = usdc_;
        operator = operator_;
    }

    function setOperator(address op) external onlyOwner {
        operator = op;
        emit OperatorChanged(op);
    }

    // --- operator ---------------------------------------------------------

    function createBasket(uint16[] calldata weights, uint64 closeTime, uint32 maxStale, string calldata meta)
        external
        onlyOperator
        returns (uint256 id)
    {
        if (weights.length == 0 || weights.length > 32) revert BadWeights();
        uint256 sum;
        for (uint256 i; i < weights.length; ++i) {
            if (weights[i] == 0) revert BadWeights();
            sum += weights[i];
        }
        if (sum != BPS) revert BadWeights();
        id = nextId++;
        Basket storage b = baskets[id];
        b.weights = weights;
        b.results = new uint8[](weights.length);
        b.open = uint8(weights.length);
        b.closeTime = closeTime;
        b.maxStale = maxStale;
        b.exists = true;
        b.meta = meta;
        emit BasketCreated(id, weights, closeTime, meta);
    }

    function postPrice(uint256 id, uint96 price) external onlyOperator {
        Basket storage b = _get(id);
        if (price == 0 || price > 2 * ONE) revert BadPrice();
        b.price = price;
        b.priceAt = uint64(block.timestamp);
        emit PricePosted(id, price, uint64(block.timestamp));
    }

    /// Anyone may add collateral; the operator tops up the gap between price and $1.
    function fund(uint256 id, uint256 amount) external {
        Basket storage b = _get(id);
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        b.reserve += amount;
        emit Funded(id, amount);
    }

    function resolveLeg(uint256 id, uint8 leg, bool hit, string calldata evidence) external onlyOperator {
        Basket storage b = _get(id);
        if (leg >= b.results.length) revert BadBasket();
        if (b.results[leg] != 0) revert AlreadyResolved();
        b.results[leg] = hit ? 1 : 2;
        b.open -= 1;
        emit LegResolved(id, leg, hit, evidence);
        if (b.open == 0) {
            uint256 hitBps;
            for (uint256 i; i < b.results.length; ++i) {
                if (b.results[i] == 1) hitBps += b.weights[i];
            }
            b.payout = (ONE * hitBps) / BPS;
            emit Settled(id, b.payout);
        }
    }

    /// After settlement, the operator takes back collateral not owed to holders.
    function sweep(uint256 id, address to) external onlyOperator {
        Basket storage b = _get(id);
        if (b.open != 0) revert NotSettled();
        uint256 owed = b.supply * b.payout;
        uint256 extra = b.reserve - owed;
        b.reserve = owed;
        usdc.safeTransfer(to, extra);
        emit Swept(id, extra);
    }

    // --- users ------------------------------------------------------------

    function quote(uint256 id, uint256 amount) external view returns (uint256) {
        return amount * _get(id).price;
    }

    function mint(uint256 id, uint256 amount, uint256 maxCost) external {
        Basket storage b = _get(id);
        if (block.timestamp >= b.closeTime || b.open != b.results.length) revert Closed();
        if (b.priceAt == 0 || block.timestamp > b.priceAt + b.maxStale) revert StalePrice();
        uint256 cost = amount * b.price;
        if (amount == 0 || cost > maxCost) revert Slippage();
        if (b.reserve + cost < (b.supply + amount) * ONE) revert Undercollateralized();
        usdc.safeTransferFrom(msg.sender, address(this), cost);
        b.reserve += cost;
        b.supply += amount;
        _mint(msg.sender, id, amount, "");
        emit Minted(id, msg.sender, amount, cost);
    }

    function redeem(uint256 id, uint256 amount) external {
        Basket storage b = _get(id);
        if (b.open != 0) revert NotSettled();
        _burn(msg.sender, id, amount);
        uint256 paid = amount * b.payout;
        b.supply -= amount;
        b.reserve -= paid;
        usdc.safeTransfer(msg.sender, paid);
        emit Redeemed(id, msg.sender, amount, paid);
    }

    // --- views ------------------------------------------------------------

    function basket(uint256 id)
        external
        view
        returns (
            uint16[] memory weights,
            uint8[] memory results,
            uint64 closeTime,
            uint96 price,
            uint64 priceAt,
            uint256 supply,
            uint256 reserve,
            uint256 payout,
            bool settled
        )
    {
        Basket storage b = _get(id);
        return (b.weights, b.results, b.closeTime, b.price, b.priceAt, b.supply, b.reserve, b.payout, b.open == 0);
    }

    function metaOf(uint256 id) external view returns (string memory) {
        return _get(id).meta;
    }

    /// Reserve over max liability in bps (10_000 = fully covered). Drives the solvency gauge.
    function solvencyBps(uint256 id) external view returns (uint256) {
        Basket storage b = _get(id);
        if (b.supply == 0) return type(uint256).max;
        return (b.reserve * BPS) / (b.supply * ONE);
    }

    function _get(uint256 id) internal view returns (Basket storage b) {
        b = baskets[id];
        if (!b.exists) revert BadBasket();
    }
}
