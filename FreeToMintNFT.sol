// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721 is IERC165 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function approve(address to, uint256 tokenId) external;
    function getApproved(uint256 tokenId) external view returns (address);
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external;
}

interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

interface IERC2981 is IERC165 {
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        returns (address receiver, uint256 royaltyAmount);
}

contract FreeToMintNFT is IERC165, IERC721, IERC2981 {
    address public owner;

    uint256 public totalSupply;
    uint256 public maxSupply; // 0 means unlimited
    uint256 public maxPerWallet; // 0 means unlimited
    bool public mintingPaused;

    string public contractMetadataURI;
    address public royaltyReceiver;
    uint96 public royaltyBasisPoints;

    mapping(address => uint256) public mintedByWallet;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _owners;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => string) private _tokenURIs;

    event Minted(address indexed to, uint256 indexed tokenId, string uri);
    event ContractURIUpdated(string newURI);
    event MintingPaused(bool paused);
    event RoyaltyUpdated(address indexed receiver, uint96 basisPoints);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        royaltyReceiver = msg.sender;
    }

    function mint(uint256 qty, string[] calldata _tokenURIs)
        external
        returns (uint256[] memory tokenIds)
    {
        require(!mintingPaused, "Minting is paused");
        require(qty > 0, "Quantity must be greater than zero");
        require(_tokenURIs.length == qty, "Length mismatch");

        if (maxSupply > 0) {
            require(totalSupply + qty <= maxSupply, "Max supply exceeded");
        }
        if (maxPerWallet > 0) {
            require(mintedByWallet[msg.sender] + qty <= maxPerWallet, "Wallet cap exceeded");
        }

        tokenIds = new uint256[](qty);
        for (uint256 i = 0; i < qty; i++) {
            require(bytes(_tokenURIs[i]).length > 0, "Empty URI");
            uint256 tokenId = ++totalSupply;
            tokenIds[i] = tokenId;
            _safeMint(msg.sender, tokenId, _tokenURIs[i]);
        }
    }

    /**
     * @notice Owner can airdrop NFTs to a list of recipients.
     */
    function airdrop(address[] calldata recipients, string[] calldata _tokenURIs)
        external onlyOwner
    {
        require(recipients.length == _tokenURIs.length, "Length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 tokenId = ++totalSupply;
            _safeMint(recipients[i], tokenId, _tokenURIs[i]);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Metadata
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Returns the metadata URI for a token.
     *         OpenSea and all explorers read this to display the NFT.
     */
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_exists(tokenId), "URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }

    /**
     * @notice Collection-level metadata for OpenSea storefront.
     *         Must return a URI pointing to JSON with keys:
     *         name, description, image, external_link, seller_fee_basis_points,
     *         fee_recipient
     */
    function contractURI() external view returns (string memory) {
        return contractMetadataURI;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ERC-2981 Royalties
    // ─────────────────────────────────────────────────────────────────────────

    function royaltyInfo(uint256 /*tokenId*/, uint256 salePrice)
        external view override returns (address receiver, uint256 royaltyAmount)
    {
        receiver      = royaltyReceiver;
        royaltyAmount = (salePrice * royaltyBasisPoints) / 10_000;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ERC-721 Core
    // ─────────────────────────────────────────────────────────────────────────

    function balanceOf(address _owner) external view override returns (uint256) {
        require(_owner != address(0), "Balance of zero address");
        return _balances[_owner];
    }

    function ownerOf(uint256 tokenId) external view override returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "Owner query for nonexistent token");
        return tokenOwner;
    }

    function approve(address to, uint256 tokenId) external override {
        address tokenOwner = _owners[tokenId];
        require(msg.sender == tokenOwner || _operatorApprovals[tokenOwner][msg.sender],
            "Not owner nor approved for all");
        _tokenApprovals[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
    }

    function getApproved(uint256 tokenId) external view override returns (address) {
        require(_exists(tokenId), "Approved query for nonexistent token");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external override {
        require(operator != msg.sender, "Approve to caller");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address _owner, address operator)
        external view override returns (bool)
    {
        return _operatorApprovals[_owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) external override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Transfer not approved");
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external override {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data)
        public override
    {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Transfer not approved");
        _transfer(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "Non ERC721Receiver");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ERC-165 Interface Detection
    // ─────────────────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId) external pure override(IERC165, IERC2981) returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId  ||
            interfaceId == type(IERC2981).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin Functions
    // ─────────────────────────────────────────────────────────────────────────

    function setContractURI(string calldata _newURI) external onlyOwner {
        contractMetadataURI = _newURI;
        emit ContractURIUpdated(_newURI);
    }

    function setMintingPaused(bool _paused) external onlyOwner {
        mintingPaused = _paused;
        emit MintingPaused(_paused);
    }

    function setRoyalty(address _receiver, uint96 _bps) external onlyOwner {
        require(_bps <= 1000, "Royalty max 10%");
        require(_receiver != address(0), "Zero receiver");
        royaltyReceiver    = _receiver;
        royaltyBasisPoints = _bps;
        emit RoyaltyUpdated(_receiver, _bps);
    }

    function setMaxSupply(uint256 _max) external onlyOwner {
        require(_max == 0 || _max >= totalSupply, "Cannot reduce below minted");
        maxSupply = _max;
    }

    function setMaxPerWallet(uint256 _max) external onlyOwner {
        maxPerWallet = _max;
    }

    /**
     * @notice Update a token's URI (useful for revealing or upgrading metadata).
     *         Only contract owner can do this.
     */
    function setTokenURI(uint256 tokenId, string calldata _newURI) external onlyOwner {
        require(_exists(tokenId), "Nonexistent token");
        _tokenURIs[tokenId] = _newURI;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    function _safeMint(address to, uint256 tokenId, string memory uri) internal {
        require(to != address(0), "Mint to zero address");
        _owners[tokenId]  = to;
        _balances[to]    += 1;
        mintedByWallet[to] += 1;
        _tokenURIs[tokenId] = uri;
        emit Transfer(address(0), to, tokenId);
        emit Minted(to, tokenId, uri);
        require(_checkOnERC721Received(address(0), to, tokenId, ""), "Non ERC721Receiver");
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        require(_owners[tokenId] == from, "Transfer from wrong owner");
        require(to != address(0), "Transfer to zero address");
        delete _tokenApprovals[tokenId];
        _balances[from]  -= 1;
        _balances[to]    += 1;
        _owners[tokenId]  = to;
        emit Transfer(from, to, tokenId);
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _owners[tokenId] != address(0);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        require(_exists(tokenId), "Operator query for nonexistent token");
        address tokenOwner = _owners[tokenId];
        return (spender == tokenOwner ||
                _tokenApprovals[tokenId] == spender ||
                _operatorApprovals[tokenOwner][spender]);
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data)
        private returns (bool)
    {
        if (to.code.length == 0) return true;
        try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data)
            returns (bytes4 retval)
        {
            return retval == IERC721Receiver.onERC721Received.selector;
        } catch {
            return false;
        }
    }
}
