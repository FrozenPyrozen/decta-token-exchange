import {
  tokens, EVM_REVERT, EVM_INVALID_ADDRESS, emitsTransferEvent,
} from './helpers';

require('chai').use(require('chai-as-promised')).should();

const Token = artifacts.require('./Token');

contract('Token', ([deployer, receiver, exchange]) => {
  let token;

  const name = 'Decta Token';
  const symbol = 'DECTA';
  const decimals = '18';
  const totalSupply = tokens(1000000).toString();

  beforeEach(async () => {
    token = await Token.new();
  });
  describe('deployment', () => {
    it('tracks the name', async () => {
      const result = await token.name();
      result.should.equal(name);
    });
    it('tracks the symbol', async () => {
      const result = await token.symbol();
      result.should.equal(symbol);
    });
    it('tracks the decimals', async () => {
      const result = await token.decimals();
      result.toString().should.equal(decimals);
    });
    it('tracks the total supply', async () => {
      const result = await token.totalSupply();
      result.toString().should.equal(totalSupply.toString());
    });

    it('asigns the total supply to the deployer', async () => {
      const result = await token.balanceOf(deployer);
      result.toString().should.equal(totalSupply.toString());
    });
  });

  describe('sending tokens', () => {
    let amount;
    let result;

    describe('success', () => {
      beforeEach(async () => {
        amount = tokens(100);
        result = await token.transfer(receiver, amount, { from: deployer });
      });

      it('transfers token balances', async () => {
        let balanceOf;
        balanceOf = await token.balanceOf(deployer);
        balanceOf.toString().should.equal(tokens(999900).toString());

        balanceOf = await token.balanceOf(receiver);
        balanceOf.toString().should.equal(tokens(100).toString());
      });

      it('emits a Transfer event', () => emitsTransferEvent(result.logs[0], { deployer, receiver, amount }));
    });

    describe('failure', async () => {
      it('rejects insufficient balances', async () => {
        let invalidAmount;

        invalidAmount = tokens(10000000000000000000); // greater than total supply
        await token.transfer(receiver, invalidAmount, { from: deployer }).should.be.rejectedWith(EVM_REVERT);

        // Attempt transfer token when you have none
        invalidAmount = tokens(10);// recipient has no tokens
        await token.transfer(receiver, invalidAmount, { from: receiver }).should.be.rejectedWith(EVM_REVERT);
      });

      it('rejects invalid recipients', async () => {
        await token.transfer(0x0, amount, { from: deployer }).should.be.rejectedWith(EVM_INVALID_ADDRESS);
      });
    });
  });

  describe('approving tokens', () => {
    let result;
    let amount;

    beforeEach(async () => {
      amount = tokens(100);
      result = await token.approve(exchange, amount, { from: deployer });
    });

    describe('success', () => {
      it('allocates an allowance for deligated token spending on exchange', async () => {
        const allowance = await token.allowance(deployer, exchange);
        allowance.toString().should.equal(amount.toString());
      });

      it('emits a Approval event', () => {
        const log = result.logs[0];
        log.event.should.equal('Approval');

        const event = log.args;
        event.owner.toString().should.equal(deployer, 'from is correct');
        event.spender.toString().should.equal(exchange, 'to is correct');
        event.value.toString().should.equal(amount.toString(), 'value is correct');
      });
    });

    describe('failure', () => {
      it('rejects invalid spenders', async () => {
        await token.transfer(0x0, amount, { from: deployer }).should.be.rejectedWith(EVM_INVALID_ADDRESS);
      });
    });
  });

  describe('delegated token transfers', () => {
    let amount;
    let result;

    beforeEach(async () => {
      amount = tokens(100);
      await token.approve(exchange, amount, { from: deployer });
    });

    describe('success', () => {
      beforeEach(async () => {
        result = await token.transferFrom(deployer, receiver, amount, { from: exchange });
      });

      it('transfers token balances from deployer to receiver', async () => {
        let balanceOf;
        balanceOf = await token.balanceOf(deployer);
        balanceOf.toString().should.equal(tokens(999900).toString());

        balanceOf = await token.balanceOf(receiver);
        balanceOf.toString().should.equal(tokens(100).toString());
      });

      it('reset the allowance after transferFrom', async () => {
        const allowance = await token.allowance(deployer, exchange);
        allowance.toString().should.equal('0');
      });

      it('emits a Transfer event', () => emitsTransferEvent(result.logs[0], { deployer, receiver, amount }));
    });

    describe('failure', async () => {
      it('rejects transfer too many tokens, more than approved', async () => {
        let invalidAmount;

        invalidAmount = tokens(10000000000000000000); // greater than total supply and approved
        await token.transferFrom(deployer, receiver, invalidAmount, { from: deployer }).should.be.rejectedWith(EVM_REVERT);
      });

      it('rejects invalid recipients', async () => {
        await token.transferFrom(deployer, 0x0, amount, { from: deployer }).should.be.rejectedWith(EVM_INVALID_ADDRESS);
      });
    });
  });
});
