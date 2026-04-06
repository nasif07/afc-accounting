const counterModel = require("../modules/common/counter.model");


const generateVoucherNumber = async (prefix = 'JV') => {
  const counter = await counterModel.findOneAndUpdate(
    { name: prefix },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const padded = String(counter.seq).padStart(6, '0');
  return `${prefix}-${padded}`;
};

module.exports = generateVoucherNumber;