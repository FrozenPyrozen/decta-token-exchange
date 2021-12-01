export const tokensFormatter = (quantity) => new web3.utils.BN(web3.utils.toWei(quantity.toString(), 'ether'));
export const EVM_REVERT = 'VM Exception while processing transaction: revert';
export const EVM_INVALID_ADDRESS = 'invalid address (argument="address", value=0, code=INVALID_ARGUMENT, version=address/5.0.5) (argument="_to", value=0, code=INVALID_ARGUMENT, version=abi/5.0.7)';
