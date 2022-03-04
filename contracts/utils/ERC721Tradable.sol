pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./common/meta-transactions/ContentMixin.sol";
import "./common/meta-transactions/NativeMetaTransaction.sol";

contract OwnableDelegateProxy {}

/**
 * @title ERC721Tradable
 * ERC721Tradable - ERC721 contract that whitelists a trading address, and has minting functionality.
 */
contract ERC721Tradable is ContextMixin, ERC721PresetMinterPauserAutoId, NativeMetaTransaction {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    // super admin
    address public admin;// multi sig address
    // operator
    address public operator;
    
    /*
     * We rely on the OZ Counter util to keep track of the next available ID.
     * We track the nextTokenId instead of the currentTokenId to save users on gas costs. 
     * Read more about it here: https://shiny.mirror.xyz/OUampBbIz9ebEicfGnQf5At_ReMHlZy0tB4glb9xQ0E
     */
    Counters.Counter private _nextTokenId;
    mapping(uint256 => string) customUri;
    
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _uri,
        address _admin,
        address _operator
    ) ERC721PresetMinterPauserAutoId(_name, _symbol, _uri) {
        // nextTokenId is initialized to 1, since starting at 0 leads to higher gas cost for the first minter
        _nextTokenId.increment();
        _initializeEIP712(_name);

        admin = _admin;
        // set role for admin address
        grantRole(DEFAULT_ADMIN_ROLE, admin);

        operator = _operator;
        // set role for operator address   
        grantRole(OPERATOR_ROLE, operator);
        grantRole(CREATOR_ROLE, operator);
        grantRole(MINTER_ROLE, operator);
        grantRole(PAUSER_ROLE, operator);

        // revoke role for sender
        revokeRole(MINTER_ROLE, _msgSender());
        revokeRole(PAUSER_ROLE, _msgSender());
        revokeRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /**
     * @dev Mints a token to an address with a tokenURI.
     * @param _to address of the future owner of the token
     */
    function mintTo(address _to, string memory _uri) public {
        uint256 currentTokenId = _nextTokenId.current();
        if (bytes(_uri).length > 0) {
            customUri[currentTokenId] = _uri;
        }
        _nextTokenId.increment();
        _safeMint(_to, currentTokenId);
    }

    /**
        @dev Returns the total tokens minted so far.
        1 is always subtracted from the Counter since it tracks the next available tokenId.
     */
    function totalSupply() public view override returns (uint256) {
        return _nextTokenId.current() - 1;
    }

    function baseTokenURI() virtual public view returns (string memory) {
        return _baseURI();
    }

    function tokenURI(uint256 _tokenId) override public view returns (string memory) {
        bytes memory customUriBytes = bytes(customUri[_tokenId]);
        if (customUriBytes.length > 0) {
            return customUri[_tokenId];
        } else {
            return string(abi.encodePacked(baseTokenURI(), Strings.toString(_tokenId)));
        }
    }

    /**
     * This is used instead of msg.sender as transactions won't be sent by the original token owner, but by OpenSea.
     */
    function _msgSender()
    internal
    override
    view
    returns (address sender)
    {
        return ContextMixin.msgSender();
    }
}