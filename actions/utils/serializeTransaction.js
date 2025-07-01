const serializeTransaction = (obj) => {
  const serialized = { ...obj };

  // if(obj.balance) {
  //     serialized.balance = obj.balance.toString();
  // }
  if (obj.balance) {
    serialized.balance = obj.balance.toNumber();
  }
  if (obj.amount) {
    serialized.amount = obj.amount.toNumber();
  }
  return serialized;
};

export default serializeTransaction;
