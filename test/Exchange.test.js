import {
  tokens, EVM_REVERT, ether, ETHER_ADDRESS, EVM_INVALID_ADDRESS, EVM_INVALID_ADDRESS_INSUFICCIENT,
} from './helpers';

require('chai').use(require('chai-as-promised')).should();

const Token = artifacts.require('./Token');
const Exchange = artifacts.require('./Exchange');

contract('Exchange', ([deployer, feeAccount, user1]) => {
  let exchange;
  let token;

  const feePercent = 10;

  beforeEach(async () => {
    exchange = await Exchange.new(feeAccount, feePercent);
    token = await Token.new();
    token.transfer(user1, tokens(100), { from: deployer });
  });
  describe('deployment', () => {
    it('tracks the fee account', async () => {
      const result = await exchange.feeAccount();
      result.should.equal(feeAccount);
    });

    it('tracks the fee percent', async () => {
      const result = await exchange.feePercent();
      result.toString().should.equal(feePercent.toString());
    });
  });

  describe('fallback', () => {
    it('rever when Ether is sent', async () => {
      await exchange.sendTransaction({ value: 1, from: user1 }).should.be.rejectedWith(EVM_REVERT);
    });
  });

  describe('depositing Ether', () => {
    let result;
    let amount;

    beforeEach(async () => {
      amount = ether(1);
      result = await exchange.depositEther({ from: user1, value: amount });
    });

    it('tracks the Ether deposit', async () => {
      const balance = await exchange.tokens(ETHER_ADDRESS, user1);
      balance.toString().should.equal(amount.toString());
    });

    it('emits a Deposit event', () => {
      const log = result.logs[0];
      log.event.should.equal('Deposit');

      const event = log.args;
      event.token.should.equal(ETHER_ADDRESS, 'token address is correct');
      event.user.should.equal(user1, 'user address is correct');
      event.amount.toString().should.equal(amount.toString(), 'amount is correct');
      event.balance.toString().should.equal(amount.toString(), 'amount is correct');
    });
  });

  describe('withdrawing Ether', () => {
    let result;
    let amount;

    beforeEach(async () => {
      amount = ether(1);
      // Deposit Ether first
      result = await exchange.depositEther({ from: user1, value: amount });
    });

    describe('success', () => {
      beforeEach(async () => {
        amount = ether(1);
        // Deposit Ether first
        result = await exchange.withdrawEther(ether(1), { from: user1 });
      });
      it('tracks the Ether deposit', async () => {
        const balance = await exchange.tokens(ETHER_ADDRESS, user1);
        balance.toString().should.equal('0');
      });

      it('emits a Withdraw event', () => {
        const log = result.logs[0];
        log.event.should.equal('Withdraw');

        const event = log.args;
        event.token.should.equal(ETHER_ADDRESS, 'token address is correct');
        event.user.should.equal(user1, 'user address is correct');
        event.amount.toString().should.equal(amount.toString(), 'amount is correct');
        event.balance.toString().should.equal('0', 'balance is correct');
      });
    });

    describe('failure', () => {
      it('rejects withdraws for insufficient balances', async () => {
        await exchange.withdrawEther(ether(100), { from: user1 }).should.be.rejectedWith(EVM_REVERT);
      });
    });
  });
  describe('depositing tokens', () => {
    let result;
    let amount;

    describe('success', () => {
      beforeEach(async () => {
        amount = tokens(10);
        await token.approve(exchange.address, amount, { from: user1 });
        result = await exchange.depositToken(token.address, amount, { from: user1 });
      });

      it('tracks the token deposit', async () => {
        let balance;

        // Check exchange token balance
        balance = await token.balanceOf(exchange.address);
        balance.toString().should.equal(amount.toString());

        // Check tokens on exchange
        balance = await exchange.tokens(token.address, user1);
        balance.toString().should.equal(amount.toString());
      });

      it('emits a Deposit event', () => {
        const log = result.logs[0];
        log.event.should.equal('Deposit');

        const event = log.args;
        event.token.should.equal(token.address, 'token address is correct');
        event.user.should.equal(user1, 'user address is correct');
        event.amount.toString().should.equal(amount.toString(), 'amount is correct');
        event.balance.toString().should.equal(amount.toString(), 'balance is correct');
      });
    });
    describe('failure', () => {
      it('rejects Ether deposits', async () => {
        await exchange.depositToken(ETHER_ADDRESS, tokens(10), { from: user1 }).should.be.rejectedWith(EVM_REVERT);
      });
      it('fails when no tokens are approved', async () => {
        await exchange.depositToken(token.address, tokens(10), { from: user1 }).should.be.rejectedWith(EVM_REVERT);
      });
    });
  });
  describe('withdrawing tokens', () => {
    let result;
    let amount;

    describe('success', () => {
      beforeEach(async () => {
        amount = tokens(10);
        // Deposit first
        await token.approve(exchange.address, amount, { from: user1 });
        await exchange.depositToken(token.address, amount, { from: user1 });

        // Withdraw tokens
        result = await exchange.withdrawToken(token.address, amount, { from: user1 });
      });

      it('withdraws token funds', async () => {
        const balance = await exchange.tokens(token.address, user1);
        balance.toString().should.equal('0');
      });

      it('emits a Withdraw event', () => {
        const log = result.logs[0];
        log.event.should.equal('Withdraw');

        const event = log.args;
        event.token.should.equal(token.address, 'token address is correct');
        event.user.should.equal(user1, 'user address is correct');
        event.amount.toString().should.equal(amount.toString(), 'amount is correct');
        event.balance.toString().should.equal('0', 'balance is correct');
      });
    });

    describe('failure', () => {
      it('rejects Ether withdraws', async () => {
        await exchange.withdrawToken(ETHER_ADDRESS, amount, { from: user1 }).should.be.rejectedWith(EVM_REVERT);
      });
      it('rejects withdraws for insufficient balances', async () => {
        await exchange.withdrawToken(token.address, amount, { from: user1 }).should.be.rejectedWith(EVM_REVERT);
      });
    });
  });

  describe('checking balances', () => {
    let amount;

    beforeEach(async () => {
      amount = tokens(10);
      await token.approve(exchange.address, amount, { from: user1 });
      await exchange.depositToken(token.address, amount, { from: user1 });

      await exchange.depositEther({ from: user1, value: amount });
    });

    it('returns user balance', async () => {
      const resultEther = await exchange.balanceOf(ETHER_ADDRESS, user1);
      resultEther.toString().should.equal((amount).toString());

      const resultToken = await exchange.balanceOf(token.address, user1);
      resultToken.toString().should.equal((amount).toString());
    });
  });
});
