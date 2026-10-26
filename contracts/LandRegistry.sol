// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Academic demonstration only; this contract is not a legal land title registry.
contract LandRegistry {
    enum TransferStatus { None, PendingPayment, PendingApproval, Approved, Rejected, Cancelled }
    struct Land {
        uint256 id; string surveyNumber; address owner; uint256 areaSqMeters;
        string location; uint64 registeredAt; bytes32 documentHash; string documentCid;
        bool transferInProgress; bool exists;
    }
    struct OwnershipRecord { address owner; uint64 timestamp; }
    struct TransferRequest {
        uint256 landId; address seller; address buyer; uint256 price;
        bool paymentDeposited; TransferStatus status; uint64 createdAt; string rejectionReason;
    }

    address public immutable administrator;
    uint256 private landCount;
    uint256 private transferCount;
    mapping(address => bool) private registrars;
    address[] private registrarList;
    mapping(uint256 => Land) private lands;
    mapping(bytes32 => uint256) private landIdBySurvey;
    mapping(uint256 => OwnershipRecord[]) private ownershipHistory;
    mapping(uint256 => uint256) private currentTransferByLand;
    mapping(uint256 => TransferRequest) private transferRequests;
    mapping(address => uint256) public escrowCredits;
    uint256 private entered = 1;

    event RegistrarAdded(address indexed registrar);
    event RegistrarRemoved(address indexed registrar);
    event LandRegistered(uint256 indexed landId, string surveyNumber, address indexed owner, bytes32 documentHash, string documentCid);
    event DocumentHashUpdated(uint256 indexed landId, bytes32 documentHash, string documentCid);
    event LandRecordCorrected(uint256 indexed landId, address indexed correctedBy);
    event TransferInitiated(uint256 indexed transferId, uint256 indexed landId, address indexed seller, address buyer, uint256 price);
    event PaymentDeposited(uint256 indexed transferId, uint256 indexed landId, address indexed buyer, uint256 amount);
    event TransferApproved(uint256 indexed transferId, uint256 indexed landId, address indexed newOwner);
    event OwnershipChanged(uint256 indexed landId, address indexed previousOwner, address indexed newOwner);
    event TransferRejected(uint256 indexed transferId, uint256 indexed landId, string reason);
    event TransferCancelled(uint256 indexed transferId, uint256 indexed landId, address indexed cancelledBy);
    event EscrowCredited(address indexed account, uint256 amount, uint256 indexed transferId);
    event EscrowWithdrawn(address indexed account, uint256 amount);

    modifier onlyAdmin() { require(msg.sender == administrator, "administrator only"); _; }
    modifier onlyRegistrar() { require(msg.sender == administrator || registrars[msg.sender], "registrar only"); _; }
    modifier nonReentrant() { require(entered == 1, "reentrant call"); entered = 2; _; entered = 1; }

    constructor() { administrator = msg.sender; }
    function addRegistrar(address account) external onlyAdmin {
        require(account != address(0) && account != administrator, "invalid registrar");
        require(!registrars[account], "already registrar"); registrars[account] = true; registrarList.push(account); emit RegistrarAdded(account);
    }
    function removeRegistrar(address account) external onlyAdmin {
        require(registrars[account], "not registrar"); registrars[account] = false;
        for (uint256 i = 0; i < registrarList.length; i++) if (registrarList[i] == account) { registrarList[i] = registrarList[registrarList.length - 1]; registrarList.pop(); break; }
        emit RegistrarRemoved(account);
    }
    function isRegistrar(address account) public view returns (bool) { return account == administrator || registrars[account]; }
    function getRegistrars() external view returns (address[] memory) { return registrarList; }

    function registerLand(address owner, string calldata surveyNumber, uint256 areaSqMeters, string calldata location, bytes32 documentHash, string calldata documentCid) external onlyRegistrar returns (uint256 id) {
        require(owner != address(0), "invalid owner");
        require(bytes(surveyNumber).length > 0 && bytes(location).length > 0, "missing details");
        require(areaSqMeters > 0, "area must be positive"); require(bytes(surveyNumber).length < 128, "survey number too long");
        bytes32 surveyKey = keccak256(bytes(surveyNumber)); require(landIdBySurvey[surveyKey] == 0, "duplicate survey number");
        id = ++landCount;
        lands[id] = Land(id, surveyNumber, owner, areaSqMeters, location, uint64(block.timestamp), documentHash, documentCid, false, true);
        landIdBySurvey[surveyKey] = id; ownershipHistory[id].push(OwnershipRecord(owner, uint64(block.timestamp)));
        emit LandRegistered(id, surveyNumber, owner, documentHash, documentCid);
    }
    function getLand(uint256 id) external view returns (Land memory) { require(lands[id].exists, "land not found"); return lands[id]; }
    function getLandBySurveyNumber(string calldata surveyNumber) external view returns (Land memory) {
        uint256 id = landIdBySurvey[keccak256(bytes(surveyNumber))]; require(id != 0, "land not found"); return lands[id];
    }
    function verifyOwnership(uint256 id, address claimedOwner) external view returns (bool) { return lands[id].exists && lands[id].owner == claimedOwner; }
    function getOwnershipHistory(uint256 id) external view returns (OwnershipRecord[] memory) { require(lands[id].exists, "land not found"); return ownershipHistory[id]; }
    function getLandCount() external view returns (uint256) { return landCount; }
    function getLandIdsByOwner(address owner) external view returns (uint256[] memory ids) {
        uint256 n; for (uint256 i = 1; i <= landCount; i++) if (lands[i].owner == owner) n++;
        ids = new uint256[](n); uint256 j; for (uint256 i = 1; i <= landCount; i++) if (lands[i].owner == owner) ids[j++] = i;
    }
    function getAllLandRecords() external view returns (Land[] memory records) {
        records = new Land[](landCount); for (uint256 i = 1; i <= landCount; i++) records[i - 1] = lands[i];
    }
    function getDocumentHash(uint256 id) external view returns (bytes32) { require(lands[id].exists, "land not found"); return lands[id].documentHash; }
    function updateDocument(uint256 id, bytes32 documentHash, string calldata cid) external onlyRegistrar {
        require(lands[id].exists, "land not found"); lands[id].documentHash = documentHash; lands[id].documentCid = cid; emit DocumentHashUpdated(id, documentHash, cid);
    }
    function recordAuthorizedCorrection(uint256 id, string calldata location, uint256 areaSqMeters, bytes32 documentHash, string calldata cid) external onlyRegistrar {
        require(lands[id].exists && bytes(location).length > 0 && areaSqMeters > 0, "invalid correction");
        lands[id].location = location; lands[id].areaSqMeters = areaSqMeters; lands[id].documentHash = documentHash; lands[id].documentCid = cid; emit LandRecordCorrected(id, msg.sender);
    }
    function initiateTransfer(uint256 landId, address buyer, uint256 price) external returns (uint256 transferId) {
        Land storage land = lands[landId]; require(land.exists, "land not found"); require(land.owner == msg.sender, "current owner only");
        require(buyer != address(0) && buyer != msg.sender, "invalid buyer"); require(price > 0, "price must be positive"); require(!land.transferInProgress, "transfer already pending");
        transferId = ++transferCount; currentTransferByLand[landId] = transferId; land.transferInProgress = true;
        transferRequests[transferId] = TransferRequest(landId, msg.sender, buyer, price, false, TransferStatus.PendingPayment, uint64(block.timestamp), "");
        emit TransferInitiated(transferId, landId, msg.sender, buyer, price);
    }
    function depositPayment(uint256 transferId) external payable {
        TransferRequest storage request = transferRequests[transferId]; require(request.status == TransferStatus.PendingPayment, "not awaiting payment");
        require(msg.sender == request.buyer, "designated buyer only"); require(msg.value == request.price, "incorrect payment amount");
        request.paymentDeposited = true; request.status = TransferStatus.PendingApproval; emit PaymentDeposited(transferId, request.landId, msg.sender, msg.value);
    }
    function approveTransfer(uint256 transferId) external onlyRegistrar {
        TransferRequest storage request = transferRequests[transferId]; require(request.status == TransferStatus.PendingApproval && request.paymentDeposited, "not awaiting approval");
        Land storage land = lands[request.landId]; require(land.owner == request.seller && land.transferInProgress, "land state changed");
        address seller = request.seller; address buyer = request.buyer; uint256 landId = request.landId; uint256 price = request.price;
        request.status = TransferStatus.Approved; request.paymentDeposited = false; land.owner = buyer; land.transferInProgress = false; currentTransferByLand[landId] = 0;
        ownershipHistory[landId].push(OwnershipRecord(buyer, uint64(block.timestamp)));
        escrowCredits[seller] += price; emit EscrowCredited(seller, price, transferId);
        emit TransferApproved(transferId, landId, buyer); emit OwnershipChanged(landId, seller, buyer);
    }
    function rejectTransfer(uint256 transferId, string calldata reason) external onlyRegistrar {
        TransferRequest storage request = transferRequests[transferId]; require(request.status == TransferStatus.PendingPayment || request.status == TransferStatus.PendingApproval, "not pending");
        request.status = TransferStatus.Rejected; request.rejectionReason = reason; uint256 landId = request.landId; lands[landId].transferInProgress = false; currentTransferByLand[landId] = 0;
        if (request.paymentDeposited) { request.paymentDeposited = false; escrowCredits[request.buyer] += request.price; emit EscrowCredited(request.buyer, request.price, transferId); }
        emit TransferRejected(transferId, landId, reason);
    }
    function cancelTransfer(uint256 transferId) external {
        TransferRequest storage request = transferRequests[transferId]; require(request.status == TransferStatus.PendingPayment || request.status == TransferStatus.PendingApproval, "not pending");
        require(msg.sender == request.seller || (msg.sender == request.buyer && request.paymentDeposited), "cancellation not allowed");
        request.status = TransferStatus.Cancelled; uint256 landId = request.landId; lands[landId].transferInProgress = false; currentTransferByLand[landId] = 0;
        if (request.paymentDeposited) { request.paymentDeposited = false; escrowCredits[request.buyer] += request.price; emit EscrowCredited(request.buyer, request.price, transferId); }
        emit TransferCancelled(transferId, landId, msg.sender);
    }
    function getTransferRequest(uint256 landId) external view returns (TransferRequest memory) { uint256 id = currentTransferByLand[landId]; require(id != 0, "no active transfer"); return transferRequests[id]; }
    function getTransferById(uint256 transferId) external view returns (TransferRequest memory) { require(transferRequests[transferId].status != TransferStatus.None, "transfer not found"); return transferRequests[transferId]; }
    function getTransferCount() external view returns (uint256) { return transferCount; }
    function withdrawEscrow() external nonReentrant {
        uint256 amount = escrowCredits[msg.sender]; require(amount > 0, "no escrow credit"); escrowCredits[msg.sender] = 0;
        (bool ok,) = payable(msg.sender).call{value: amount}(""); require(ok, "withdrawal failed"); emit EscrowWithdrawn(msg.sender, amount);
    }
    function getPendingTransfers() external view returns (uint256[] memory ids) {
        uint256 n; for (uint256 i = 1; i <= transferCount; i++) if (transferRequests[i].status == TransferStatus.PendingPayment || transferRequests[i].status == TransferStatus.PendingApproval) n++;
        ids = new uint256[](n); uint256 j; for (uint256 i = 1; i <= transferCount; i++) if (transferRequests[i].status == TransferStatus.PendingPayment || transferRequests[i].status == TransferStatus.PendingApproval) ids[j++] = i;
    }
}
