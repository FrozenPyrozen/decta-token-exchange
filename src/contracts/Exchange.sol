// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./Token.sol";

contract Exchange {
    using SafeMath for uint;

    // Variables
    address public feeAccount; // the account that receives exchange fees
    uint256 public feePercent; // the fee percentage
    address constant ETHER = address(0); // store Ether in tokens mapping with blank address

    mapping(address => mapping(address => uint256)) public tokens;

    // Events
    event Deposit(address token, address user, uint256 amount, uint256 balance);


    constructor (address _feeAccount, uint256 _feePercent) {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    // Fallback: reverts if Ether is sent to this smart contract by mistake
    fallback() external {
        revert();
    }

    function depositEther () payable public {
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].add(msg.value);
        emit Deposit(ETHER, msg.sender, tokens[ETHER][msg.sender], msg.value);
    }

    function depositToken (address _token, uint _amount) public {
        require(_token != ETHER);
        require(Token(_token).transferFrom(msg.sender, address(this), _amount));
        tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
        emit Deposit(_token, msg.sender, tokens[_token][msg.sender], _amount);
    }
}

// Deposit & Withdraw funds
// Manage Orders - Make or Cancel
// Handle Trades - Set and -Charge fees