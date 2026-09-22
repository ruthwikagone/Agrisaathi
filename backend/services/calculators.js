const { AppError } = require('../errors');

function requiredNonNegative(input, key) {
  const value = Number(input[key]);

  if (!Number.isFinite(value) || value < 0) {
    throw new AppError(
      422,
      'INVALID_CALCULATION_INPUT',
      `${key} must be a non-negative number.`
    );
  }

  return value;
}

function optionalNonNegative(input, key) {
  if (
    input[key] === undefined ||
    input[key] === null ||
    input[key] === ''
  ) {
    return 0;
  }

  return requiredNonNegative(input, key);
}

function farmCalculation(input) {
  const area = requiredNonNegative(input, 'area');
  const expectedYieldPerAcre = requiredNonNegative(
    input,
    'expectedYieldPerAcre'
  );
  const sellingPrice = requiredNonNegative(input, 'sellingPrice');

  const costs = [
    'seedCost',
    'fertilizerCost',
    'pesticideCost',
    'labourCost',
    'irrigationCost',
    'otherCost'
  ].reduce(
    (sum, key) => sum + optionalNonNegative(input, key),
    0
  );

  const production = area * expectedYieldPerAcre;
  const revenue = production * sellingPrice;
  const profit = revenue - costs;

  return {
    area,
    unit: input.areaUnit || 'acre',
    yieldUnit: input.yieldUnit || 'unit',
    currency: input.currency || 'INR',

    production,
    revenue,
    totalCost: costs,
    profit,

    perAcreRevenue: area ? revenue / area : 0,
    perAcreCost: area ? costs / area : 0,
    perAcreProfit: area ? profit / area : 0
  };
}

function pesticideCalculation(input) {
  const area = requiredNonNegative(input, 'farmArea');
  const verifiedDosage = requiredNonNegative(
    input,
    'verifiedDosage'
  );
  const waterPerAcre = requiredNonNegative(
    input,
    'waterPerAcre'
  );
  const tankCapacity = requiredNonNegative(
    input,
    'tankCapacity'
  );

  if (tankCapacity === 0) {
    throw new AppError(
      422,
      'INVALID_CALCULATION_INPUT',
      'tankCapacity must be greater than zero.'
    );
  }

  // Actual calculations
  const totalProduct = area * verifiedDosage;
  const totalWater = area * waterPerAcre;

  // Number of tanks must be rounded UP because a partial tank
  // still requires another tank/container.
  const tanks = Math.ceil(totalWater / tankCapacity);

  return {
    farmArea: area,
    areaUnit: input.areaUnit || 'acre',

    productName: input.productName || null,
    activeIngredient: input.activeIngredient || null,

    dosageUnit:
      input.dosageUnit || 'product units per acre',

    waterUnit: input.waterUnit || 'L',

    // Round floating-point results for clean display
    totalProduct: Number(totalProduct.toFixed(2)),
    totalWater: Number(totalWater.toFixed(2)),
    tankCapacity: Number(tankCapacity.toFixed(2)),

    tanks,

    productPerTank: Number(
      (tanks ? totalProduct / tanks : 0).toFixed(2)
    ),

    waterPerTank: Number(
      (tanks ? totalWater / tanks : 0).toFixed(2)
    ),

    warning:
      'Verify against the product label. This calculation uses only the verified dosage you entered.'
  };
}

module.exports = {
  farmCalculation,
  pesticideCalculation
};