// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {WeaveBasket} from "./WeaveBasket.sol";
import {MockUSDC} from "./MockUSDC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract WeaveBasketTest is Test {
    WeaveBasket w;
    MockUSDC usdc;
    address op = address(0xA11CE);
    address user = address(0xB0B);
    uint256 id;

    function setUp() public {
        usdc = new MockUSDC();
        w = new WeaveBasket(IERC20(address(usdc)), op, "");
        usdc.mint(op, 1_000e6);
        usdc.mint(user, 100e6);
        vm.prank(op);
        usdc.approve(address(w), type(uint256).max);
        vm.prank(user);
        usdc.approve(address(w), type(uint256).max);
        uint16[] memory ws = new uint16[](2);
        ws[0] = 7000;
        ws[1] = 3000;
        vm.startPrank(op);
        id = w.createBasket(ws, uint64(block.timestamp + 1 hours), 120, "crash-1h");
        w.fund(id, 100e6);
        w.postPrice(id, 400_000); // $0.40
        vm.stopPrank();
    }

    function test_mintAndRedeemProRata() public {
        vm.prank(user);
        w.mint(id, 10, 4e6);
        assertEq(w.balanceOf(user, id), 10);
        vm.startPrank(op);
        w.resolveLeg(id, 0, true, "BTC2611190500 resolutionSide=no");
        w.resolveLeg(id, 1, false, "ETH2611190500 resolutionSide=yes");
        vm.stopPrank();
        uint256 before = usdc.balanceOf(user);
        vm.prank(user);
        w.redeem(id, 10);
        assertEq(usdc.balanceOf(user) - before, 7e6); // 10 tokens x $0.70
    }

    function test_rejectsStalePrice() public {
        vm.warp(block.timestamp + 121);
        vm.prank(user);
        vm.expectRevert(WeaveBasket.StalePrice.selector);
        w.mint(id, 1, 1e6);
    }

    function test_rejectsAfterClose() public {
        vm.warp(block.timestamp + 1 hours);
        vm.prank(op);
        w.postPrice(id, 400_000);
        vm.prank(user);
        vm.expectRevert(WeaveBasket.Closed.selector);
        w.mint(id, 1, 1e6);
    }

    function test_rejectsUndercollateralized() public {
        // reserve 100 + 400 x 0.40 = 260 < 400 max liability
        usdc.mint(user, 1_000e6);
        vm.prank(user);
        vm.expectRevert(WeaveBasket.Undercollateralized.selector);
        w.mint(id, 400, 1_000e6);
    }

    function test_slippage() public {
        vm.prank(user);
        vm.expectRevert(WeaveBasket.Slippage.selector);
        w.mint(id, 10, 3e6);
    }

    function test_resolutionIsOneShot() public {
        vm.startPrank(op);
        w.resolveLeg(id, 0, true, "");
        vm.expectRevert(WeaveBasket.AlreadyResolved.selector);
        w.resolveLeg(id, 0, false, "");
        vm.stopPrank();
    }

    function test_onlyOperator() public {
        vm.prank(user);
        vm.expectRevert(WeaveBasket.NotOperator.selector);
        w.resolveLeg(id, 0, true, "");
    }

    function test_noRedeemBeforeSettle() public {
        vm.prank(user);
        w.mint(id, 1, 1e6);
        vm.prank(user);
        vm.expectRevert(WeaveBasket.NotSettled.selector);
        w.redeem(id, 1);
    }

    function test_noMintAfterAnyLegResolves() public {
        vm.prank(op);
        w.resolveLeg(id, 0, true, "");
        vm.prank(user);
        vm.expectRevert(WeaveBasket.Closed.selector);
        w.mint(id, 1, 1e6);
    }

    function test_sweepLeavesOwed() public {
        vm.prank(user);
        w.mint(id, 10, 4e6);
        vm.startPrank(op);
        w.resolveLeg(id, 0, false, "");
        w.resolveLeg(id, 1, true, "");
        w.sweep(id, op);
        vm.stopPrank();
        (,,,,,, uint256 reserve,,) = w.basket(id);
        assertEq(reserve, 3e6);
        vm.prank(user);
        w.redeem(id, 10);
        assertEq(usdc.balanceOf(address(w)), 0);
    }

    function test_badWeights() public {
        uint16[] memory ws = new uint16[](2);
        ws[0] = 5000;
        ws[1] = 4000;
        vm.prank(op);
        vm.expectRevert(WeaveBasket.BadWeights.selector);
        w.createBasket(ws, uint64(block.timestamp + 1), 60, "");
    }

    function testFuzz_alwaysSolvent(uint8 n, bool a, bool b) public {
        uint256 amt = bound(n, 1, 160);
        vm.prank(user);
        w.mint(id, amt, type(uint256).max);
        assertGe(w.solvencyBps(id), 10_000);
        vm.startPrank(op);
        w.resolveLeg(id, 0, a, "");
        w.resolveLeg(id, 1, b, "");
        w.sweep(id, op);
        vm.stopPrank();
        vm.prank(user);
        w.redeem(id, amt);
        assertEq(usdc.balanceOf(address(w)), 0);
    }
}
