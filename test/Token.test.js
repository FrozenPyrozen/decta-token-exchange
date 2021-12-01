import { tokensFormatter, EVM_REVERT, EVM_INVALID_ADDRESS } from './helpers';

require('chai').use(require('chai-as-promised')).should();

const Token = artifacts.require('./Token');

contract('Token', ([deployer, receiver]) => {
  let token;

  const name = 'Decta Token';
  const symbol = 'DECTA';
  const decimals = '18';
  const totalSupply = tokensFormatter(1000000).toString();

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

    describe('success', async () => {
      beforeEach(async () => {
        amount = tokensFormatter(100);
        result = await token.transfer(receiver, amount, { from: deployer });
      });

      it('transfers token balances', async () => {
        let balanceOf;
        balanceOf = await token.balanceOf(deployer);
        balanceOf.toString().should.equal(tokensFormatter(999900).toString());

        balanceOf = await token.balanceOf(receiver);
        balanceOf.toString().should.equal(tokensFormatter(100).toString());
      });

      it('emits a transfer event', async () => {
        const log = result.logs[0];
        log.event.should.equal('Transfer');

        const event = log.args;
        event.from.toString().should.equal(deployer, 'from is correct');
        event.to.toString().should.equal(receiver, 'to is correct');
        event.value.toString().should.equal(amount.toString(), 'value is correct');
      });
    });

    describe('failure', async () => {
      it('rejects insufficient balances', async () => {
        let invalidAmount;

        invalidAmount = tokensFormatter(10000000000000000000); // greater than total supply
        await token.transfer(receiver, invalidAmount, { from: deployer }).should.be.rejectedWith(EVM_REVERT);

        // Attempt transfer token when you have none
        invalidAmount = tokensFormatter(10);// recipient has no tokens
        await token.transfer(receiver, invalidAmount, { from: receiver }).should.be.rejectedWith(EVM_REVERT);
      });

      it('rejects invalid recipients', async () => {
        await token.transfer(0x0, amount, { from: deployer }).should.be.rejectedWith(EVM_INVALID_ADDRESS);
      });
    });
  });
});
