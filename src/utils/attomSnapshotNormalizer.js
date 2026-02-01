/**
 * Normalizes raw ATTOM allevents/snapshot API response into sections A–G
 * for the Property Detail UI. Handles various response shapes with fallbacks.
 */

const pick = (obj, ...paths) => {
  for (const p of paths) {
    if (obj == null) return undefined;
    const keys = typeof p === 'string' ? p.split('.') : [p];
    let v = obj;
    for (const k of keys) {
      v = v?.[k];
      if (v === undefined) break;
    }
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
};

const num = (v) => (v != null && Number.isFinite(Number(v)) ? Number(v) : null);
const str = (v) => (v != null ? String(v) : null);
const arr = (v) => (Array.isArray(v) ? v : v != null ? [v] : []);

const getFirstProperty = (payload) => {
  const list = payload?.property ?? payload?.properties ?? payload;
  const arr = Array.isArray(list) ? list : list != null ? [list] : [];
  return arr[0] ?? null;
};

/**
 * A) Physical Characteristics
 */
function normalizePhysical(p) {
  if (!p) return null;
  const building = p.building ?? {};
  const rooms = building.rooms ?? building ?? {};
  const size = building.size ?? building ?? {};
  const summary = p.summary ?? {};
  const propType = pick(p, 'summary.proptype', 'summary.propType', 'propertyType', 'proptype') ?? summary.proptype ?? summary.propType;
  const livingArea = num(pick(p, 'building.size.universalsize', 'building.size.universalSize', 'building.size.buildingSize', 'squarefeet', 'squareFeet')) ?? num(size.universalsize ?? size.universalSize ?? size.buildingSize);
  const lotSize = num(pick(p, 'lot.lotSize1', 'lot.size', 'lotSizeSqft', 'lotSize'));
  const yearBuilt = num(pick(p, 'building.yearBuilt', 'yearbuilt', 'yearBuilt')) ?? str(pick(p, 'building.yearBuilt', 'yearbuilt', 'yearBuilt'));
  const beds = num(rooms.beds ?? p.beds);
  const baths = num(rooms.bathstotal ?? rooms.bathsTotal ?? p.bathstotal ?? p.bathsTotal ?? p.baths);
  const constructionType = str(pick(p, 'building.constructionType', 'building.constructiontype', 'constructionType'));
  const stories = num(pick(p, 'building.stories', 'stories'));
  if (!propType && livingArea == null && lotSize == null && yearBuilt == null && beds == null && baths == null && !constructionType && stories == null) return null;
  return {
    propertyType: str(propType),
    livingAreaSqft: livingArea,
    lotSizeSqft: lotSize,
    yearBuilt: yearBuilt != null ? yearBuilt : str(pick(p, 'building.yearBuilt', 'yearbuilt', 'yearBuilt')),
    beds,
    baths,
    constructionType,
    stories,
  };
}

/**
 * B) Ownership & Deed Events
 */
function normalizeOwnership(p) {
  if (!p) return null;
  const owner = p.owner ?? p.ownership ?? {};
  const sale = p.sale ?? {};
  const saleAmt = sale.amount ?? sale;
  const salePrice = num(saleAmt?.saleAmt ?? saleAmt?.saleamt ?? sale.saleAmt ?? sale.saleamt);
  const saleDate = str(sale.saleSearchDate ?? sale.salesearchdate ?? sale.saleTransDate ?? sale.saletransdate ?? sale.recordingDate ?? sale.recordingdate);
  const deedType = str(sale.deedType ?? sale.deedtype ?? sale.type);
  const recordingDate = str(sale.recordingDate ?? sale.recordingdate ?? sale.documentDate ?? sale.documentdate);
  const ownerNames = arr(owner.owner ?? owner.name ?? owner.ownerName).map((n) => (typeof n === 'string' ? n : n?.name ?? n?.fullName));
  const ownerNameSingle = str(owner.owner ?? owner.name ?? owner.ownerName);
  if (ownerNameSingle && !ownerNames.includes(ownerNameSingle)) ownerNames.push(ownerNameSingle);
  const currentOwnerNames = ownerNames.filter(Boolean).length ? [...new Set(ownerNames.filter(Boolean))] : null;
  const chain = arr(p.ownershipChain ?? p.sales ?? p.saleHistory).map((e) => ({
    seller: str(e.seller ?? e.grantor),
    buyer: str(e.buyer ?? e.grantee),
    saleDate: str(e.saleDate ?? e.saleTransDate ?? e.recordingDate),
    price: num(e.saleAmt ?? e.saleamt ?? e.price),
    deedType: str(e.deedType ?? e.deedtype),
    recordingDate: str(e.recordingDate ?? e.recordingdate),
  })).filter((e) => e.seller || e.buyer || e.saleDate || e.price != null);
  if (!currentOwnerNames && !saleDate && !deedType && !recordingDate && salePrice == null && !chain.length) return null;
  return {
    currentOwnerNames,
    lastTransferDate: saleDate || null,
    lastDeedType: deedType || null,
    lastRecordingDate: recordingDate || null,
    lastSalePrice: salePrice,
    ownershipChain: chain.length ? chain : null,
  };
}

/**
 * C) Mortgage & Financing
 */
function normalizeMortgage(p) {
  if (!p) return null;
  const loans = arr(p.mortgage ?? p.loan ?? p.mortgages ?? p.loans);
  const activeMortgages = loans.map((m) => ({
    originalLoanAmount: num(m.originalLoanAmount ?? m.originalloanamount ?? m.amount ?? m.loanAmount),
    lenderName: str(m.lenderName ?? m.lendername ?? m.lender ?? m.mortgageCompany),
    loanType: str(m.loanType ?? m.loantype ?? m.type),
    interestRate: num(m.interestRate ?? m.interestrate ?? m.rate) ?? str(m.interestRate ?? m.interestrate),
    recordingDate: str(m.recordingDate ?? m.recordingdate),
  })).filter((e) => e.originalLoanAmount != null || e.lenderName || e.loanType);
  const refi = arr(p.refinance ?? p.refinanceEvents ?? p.refinances);
  const refinanceEvents = refi.map((e) => ({
    date: str(e.date ?? e.recordingDate ?? e.recordingdate),
    originalLoanAmount: num(e.originalLoanAmount ?? e.amount),
    lenderName: str(e.lenderName ?? e.lender),
  })).filter((e) => e.date || e.originalLoanAmount != null);
  const secondaries = arr(p.secondaryLiens ?? p.heloc ?? p.helocs ?? p.secondaryLiensOrHelocs);
  const secondaryLiensOrHelocs = secondaries.map((e) => ({
    amount: num(e.amount ?? e.originalLoanAmount),
    lenderName: str(e.lenderName ?? e.lender),
    type: str(e.type ?? e.loanType),
    recordingDate: str(e.recordingDate),
  })).filter((e) => e.amount != null || e.lenderName);
  if (!activeMortgages.length && !refinanceEvents.length && !secondaryLiensOrHelocs.length) return null;
  return {
    activeMortgages: activeMortgages.length ? activeMortgages : null,
    refinanceEvents: refinanceEvents.length ? refinanceEvents : null,
    secondaryLiensOrHelocs: secondaryLiensOrHelocs.length ? secondaryLiensOrHelocs : null,
  };
}

/**
 * D) Sales History
 */
function normalizeSalesHistory(p) {
  if (!p) return null;
  const sales = arr(p.sales ?? p.saleHistory ?? p.salesHistory ?? (p.sale ? [p.sale] : []));
  const salesHistory = sales.map((s) => ({
    saleDate: str(s.saleSearchDate ?? s.saleTransDate ?? s.recordingDate ?? s.date ?? s.saleDate),
    salePrice: num(s.saleAmt ?? s.saleamt ?? s.amount ?? s.price),
    armsLengthIndicator: str(s.armsLength ?? s.armslength ?? s.armsLengthIndicator),
    transactionType: str(s.transactionType ?? s.transactiontype ?? s.type),
    flipSignal: str(s.flipSignal ?? s.flipsignal) ?? (s.flip === true || s.flip === 'Y' ? 'Y' : null),
  })).filter((e) => e.saleDate || e.salePrice != null);
  if (!salesHistory.length) return null;
  return { salesHistory };
}

/**
 * E) Valuation & Equity
 */
function normalizeValuation(p) {
  if (!p) return null;
  const avm = p.avm ?? p.valuation ?? {};
  const amt = avm.amount ?? avm;
  const avmValue = num(amt?.value ?? amt?.amount ?? avm?.value ?? avm?.amount ?? p.estimate);
  const equity = p.equity ?? p.estimatedEquity ?? {};
  const estimatedEquity = num(equity?.amount ?? equity?.value ?? equity ?? p.estimatedEquity);
  const estimatedLTV = num(p.estimatedLTV ?? p.estimatedltv ?? p.ltv) ?? str(p.estimatedLTV ?? p.ltv);
  const priceTrend = str(p.priceTrend ?? p.priceTrendIndicators ?? p.trend);
  const confidenceScore = num(p.confidenceScore ?? p.confidence ?? avm?.confidence) ?? str(p.confidenceScore ?? avm?.confidence);
  if (avmValue == null && estimatedEquity == null && estimatedLTV == null && !priceTrend && confidenceScore == null) return null;
  return {
    avmValue,
    estimatedEquity,
    estimatedLTV,
    priceTrendIndicators: priceTrend || null,
    confidenceScore,
  };
}

/**
 * F) Tax & Assessment
 */
function normalizeTax(p) {
  if (!p) return null;
  const tax = p.tax ?? p.assessment ?? p.assessed ?? {};
  const assessedValueLand = num(tax.assessedValueLand ?? tax.assessedvalueland ?? tax.landValue ?? tax.land);
  const assessedValueImprovement = num(tax.assessedValueImprovement ?? tax.assessedvalueimprovement ?? tax.improvementValue ?? tax.improvement);
  const assessedValueTotal = num(tax.assessedValueTotal ?? tax.assessedvaluetotal ?? tax.total ?? tax.assessedValue) ?? (assessedValueLand != null || assessedValueImprovement != null ? (assessedValueLand ?? 0) + (assessedValueImprovement ?? 0) : null);
  const taxMarketValue = num(tax.taxMarketValue ?? tax.taxmarketvalue ?? tax.marketValue ?? tax.market);
  const taxYear = num(tax.taxYear ?? tax.taxyear ?? tax.year) ?? str(tax.taxYear ?? tax.taxYear);
  const taxAmount = num(tax.taxAmount ?? tax.taxamount ?? tax.amount ?? p.propertyTax);
  const exemptions = arr(tax.exemptions ?? tax.exemption).filter(Boolean).map((e) => (typeof e === 'string' ? e : e?.type ?? e?.name ?? JSON.stringify(e)));
  if (assessedValueLand == null && assessedValueImprovement == null && assessedValueTotal == null && taxMarketValue == null && taxYear == null && taxAmount == null && !exemptions.length) return null;
  return {
    assessedValueLand,
    assessedValueImprovement,
    assessedValueTotal,
    taxMarketValue,
    taxYear: taxYear != null ? taxYear : str(tax.taxYear ?? tax.year),
    taxAmount,
    exemptions: exemptions.length ? exemptions : null,
  };
}

/**
 * G) Distress / Default
 */
function normalizeDistress(p) {
  if (!p) return null;
  const distress = p.distress ?? p.foreclosure ?? p.default ?? {};
  const foreclosureFilings = arr(distress.foreclosureFilings ?? distress.foreclosures ?? distress.filings ?? p.foreclosureFilings);
  const preForeclosure = distress.preForeclosure ?? distress.preforeclosure ?? p.preForeclosure;
  const auctionNotices = arr(distress.auctionNotices ?? distress.auctions ?? p.auctionNotices);
  const reoStatus = str(distress.reoStatus ?? distress.reostatus ?? p.reoStatus ?? p.reo);
  const hasPreForeclosure = preForeclosure === true || preForeclosure === 'Y' || (typeof preForeclosure === 'object' && preForeclosure != null);
  const hasFilings = foreclosureFilings.length > 0;
  const hasAuctions = auctionNotices.length > 0;
  if (!hasFilings && !hasPreForeclosure && !hasAuctions && !reoStatus) return null;
  return {
    foreclosureFilings: foreclosureFilings.length ? foreclosureFilings : null,
    preForeclosure: hasPreForeclosure ? (typeof preForeclosure === 'object' ? preForeclosure : true) : null,
    auctionNotices: auctionNotices.length ? auctionNotices : null,
    reoStatus: reoStatus || null,
  };
}

/**
 * Normalize full ATTOM snapshot response into sections A–G.
 * @param {object} apiResponse - Raw getPropertySnapshot payload (e.g. { property: [...] })
 * @returns {object} { physical, ownership, mortgage, salesHistory, valuation, tax, distress }
 */
export function normalizeAttomSnapshot(apiResponse) {
  const p = getFirstProperty(apiResponse);
  if (!p) return {};
  return {
    physical: normalizePhysical(p),
    ownership: normalizeOwnership(p),
    mortgage: normalizeMortgage(p),
    salesHistory: normalizeSalesHistory(p),
    valuation: normalizeValuation(p),
    tax: normalizeTax(p),
    distress: normalizeDistress(p),
  };
}
