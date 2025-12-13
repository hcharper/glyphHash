// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CompliancePaymentTrigger
 * @notice Smart contract for automated USDC payments when compliance logs are confirmed
 * @dev This contract integrates with Hedera Token Service (HTS) for USDC transfers
 */
contract CompliancePaymentTrigger {
    // HTS USDC Token Address on Hedera (example)
    address public usdcTokenAddress;
    
    // Treasury address that receives compliance fees
    address public treasury;
    
    // Owner/Admin address
    address public owner;
    
    // Payment amount per compliance log (in smallest unit, e.g., 0.01 USDC = 10000 units with 6 decimals)
    uint256 public paymentPerLog;
    
    // Mapping to track processed logs (prevent double payments)
    mapping(bytes32 => bool) public processedLogs;
    
    // Events
    event LogPaymentProcessed(
        bytes32 indexed logId,
        string hcsTopicId,
        uint256 sequenceNumber,
        uint256 amount,
        address indexed payer
    );
    
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event PaymentAmountUpdated(uint256 oldAmount, uint256 newAmount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    /**
     * @notice Constructor to initialize the contract
     * @param _usdcTokenAddress Address of USDC token on Hedera
     * @param _treasury Treasury address to receive payments
     * @param _paymentPerLog Payment amount per log (in token's smallest unit)
     */
    constructor(
        address _usdcTokenAddress,
        address _treasury,
        uint256 _paymentPerLog
    ) {
        require(_usdcTokenAddress != address(0), "Invalid USDC token address");
        require(_treasury != address(0), "Invalid treasury address");
        require(_paymentPerLog > 0, "Payment amount must be greater than 0");
        
        usdcTokenAddress = _usdcTokenAddress;
        treasury = _treasury;
        paymentPerLog = _paymentPerLog;
        owner = msg.sender;
    }
    
    /**
     * @notice Process payment for a confirmed compliance log
     * @param logId Unique identifier for the compliance log
     * @param hcsTopicId Hedera Consensus Service topic ID
     * @param sequenceNumber HCS message sequence number
     * @param evidenceHash Hash of the evidence file
     */
    function processLogPayment(
        bytes32 logId,
        string memory hcsTopicId,
        uint256 sequenceNumber,
        bytes32 evidenceHash
    ) external payable {
        require(!processedLogs[logId], "Log already processed");
        require(bytes(hcsTopicId).length > 0, "Invalid HCS topic ID");
        require(sequenceNumber > 0, "Invalid sequence number");
        
        // Mark log as processed
        processedLogs[logId] = true;
        
        // In a full implementation, this would:
        // 1. Call HTS to transfer USDC from msg.sender to treasury
        // 2. Verify HCS message existence via Mirror Node query
        // 3. Validate evidence hash
        
        // For demonstration, we emit an event
        emit LogPaymentProcessed(
            logId,
            hcsTopicId,
            sequenceNumber,
            paymentPerLog,
            msg.sender
        );
    }
    
    /**
     * @notice Check if a log has been processed
     * @param logId The compliance log identifier
     * @return bool True if processed, false otherwise
     */
    function isLogProcessed(bytes32 logId) external view returns (bool) {
        return processedLogs[logId];
    }
    
    /**
     * @notice Update treasury address
     * @param newTreasury New treasury address
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }
    
    /**
     * @notice Update payment amount per log
     * @param newAmount New payment amount
     */
    function updatePaymentAmount(uint256 newAmount) external onlyOwner {
        require(newAmount > 0, "Payment amount must be greater than 0");
        uint256 oldAmount = paymentPerLog;
        paymentPerLog = newAmount;
        emit PaymentAmountUpdated(oldAmount, newAmount);
    }
    
    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        owner = newOwner;
    }
    
    /**
     * @notice Get contract configuration
     * @return Configuration details
     */
    function getConfig() external view returns (
        address _usdcTokenAddress,
        address _treasury,
        uint256 _paymentPerLog,
        address _owner
    ) {
        return (usdcTokenAddress, treasury, paymentPerLog, owner);
    }
}
