export const tokens = (quantity) => new web3.utils.BN(web3.utils.toWei(quantity.toString(), 'ether'));
export const EVM_REVERT = 'VM Exception while processing transaction: revert';
export const EVM_INVALID_ADDRESS = 'invalid address (argument="address", value=0, code=INVALID_ARGUMENT, version=address/5.0.5) (argument="_to", value=0, code=INVALID_ARGUMENT, version=abi/5.0.7)';

export const emitsTransferEvent = (log, { deployer, receiver, amount }) => {
  log.event.should.equal('Transfer');

  const event = log.args;
  event.from.toString().should.equal(deployer.toString(), 'from is correct');
  event.to.toString().should.equal(receiver.toString(), 'to is correct');
  event.value.toString().should.equal(amount.toString(), 'value is correct');
};
