# Solidity Smart Contracts for glyphHash

## CompliancePaymentTrigger.sol

This smart contract manages automated USDC payments when compliance logs are confirmed on the Hedera network.

### Features

- **Automated Payments**: Triggers USDC payments when compliance logs are confirmed on HCS
- **Payment Tracking**: Prevents duplicate payments for the same compliance log
- **Configurable**: Owner can update treasury address and payment amounts
- **HTS Integration**: Designed to work with Hedera Token Service for USDC transfers

### Deployment

1. Deploy to Hedera EVM:
```bash
# Install Hardhat (if not already installed)
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Deploy script
npx hardhat run scripts/deploy.js --network hedera-testnet
```

2. Constructor Parameters:
- `_usdcTokenAddress`: Hedera USDC token address (HTS token as EVM address)
- `_treasury`: Address to receive compliance fees
- `_paymentPerLog`: Payment amount in smallest unit (e.g., 10000 for 0.01 USDC with 6 decimals)

### Integration with glyphHash

The backend worker can call this contract when a compliance log is confirmed:

```typescript
// After HCS confirmation
const logId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(log.id));
await contract.processLogPayment(
  logId,
  log.hcsTopicId,
  log.hcsSequenceNumber,
  log.evidenceHash
);
```

### Security Considerations

- Only processes each log once (prevents double payments)
- Owner-only functions for configuration updates
- Validates all inputs before processing
- Events emitted for all critical operations

### Future Enhancements

- Direct HTS token transfer integration
- Oracle integration for HCS message verification
- Multi-token support (beyond USDC)
- Tiered pricing based on compliance category
- Batch payment processing
