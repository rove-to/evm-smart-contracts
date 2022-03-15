// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/presets/ERC1155PresetMinterPauser.sol";

import "./common/meta-transactions/NativeMetaTransaction.sol";
import "./IERC1155Tradable.sol";

/**
 * @title ERC1155Tradable
 * ERC1155Tradable - ERC1155 contract that whitelists an operator address, has create and mint functionality, and supports useful standards from OpenZeppelin,
  like _exists(), name(), symbol(), and totalSupply()
 */
contract ERC1155Tradable is ERC1155PresetMinterPauser, NativeMetaTransaction, IERC1155Tradable {
    event OperatorChanged (address previous, address new_);
    event AdminChanged (address previous, address new_);

    // super admin
    address public admin;// multi sig address
    // operator
    address public operator;

    mapping(uint256 => address) public creators;
    mapping(uint256 => uint256) public tokenSupply;
    mapping(uint256 => string) customUri;
    // Contract name
    string public name;
    // Contract symbol
    string public symbol;

    /**
     * @dev Require _msgSender() to be the creator of the token id
   */
    modifier creatorOnly(uint256 _id) {
        require(creators[_id] == _msgSender(), "OCA");
        _;
    }

    /**
     * @dev Require _msgSender() to own more than 0 of the token id
   */
    modifier ownersOnly(uint256 _id) {
        require(balanceOf(_msgSender(), _id) > 0, "OOA");
        _;
    }

    modifier operatorOnly() {
        require(_msgSender() == operator, "OOA");
        require(hasRole(OPERATOR_ROLE, _msgSender()), "OOA");
        _;
    }

    modifier adminOnly() {
        require(_msgSender() == admin, "OAA");
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "OAA");
        _;
    }

    bytes32 constant CREATOR_ROLE = keccak256("CRE_R");
    bytes32 constant OPERATOR_ROLE = keccak256("OPE_R");

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _uri,
        address _admin,
        address _operator
    ) ERC1155PresetMinterPauser(_uri) {
        name = _name;
        symbol = _symbol;
        _initializeEIP712(name);
        admin = _admin;
        grantRole(DEFAULT_ADMIN_ROLE, admin);

        operator = _operator;
        grantRole(OPERATOR_ROLE, operator);
        grantRole(CREATOR_ROLE, operator);
        grantRole(MINTER_ROLE, operator);
        grantRole(PAUSER_ROLE, operator);

        if (admin != _msgSender()) {
            // revoke role for sender
            revokeRole(MINTER_ROLE, _msgSender());
            revokeRole(PAUSER_ROLE, _msgSender());
            revokeRole(DEFAULT_ADMIN_ROLE, _msgSender());
        }
    }

    // changeOperator: update operator by admin
    function changeOperator(address _newOperator) public adminOnly {
        require(_msgSender() == admin, "SNA");
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "SNAR");

        address _previousOperator = operator;
        operator = _newOperator;

        grantRole(OPERATOR_ROLE, operator);
        grantRole(CREATOR_ROLE, operator);
        grantRole(MINTER_ROLE, operator);
        grantRole(PAUSER_ROLE, operator);

        revokeRole(OPERATOR_ROLE, _previousOperator);
        revokeRole(CREATOR_ROLE, _previousOperator);
        revokeRole(MINTER_ROLE, _previousOperator);
        revokeRole(PAUSER_ROLE, _previousOperator);

        emit OperatorChanged(_previousOperator, operator);
    }

    // changeOperator: update admin by old admin
    function changeAdmin(address _newAdmin) public adminOnly {
        require(_msgSender() == admin, "SNA");
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "SNAR");

        address _previousAdmin = admin;
        admin = _newAdmin;

        grantRole(DEFAULT_ADMIN_ROLE, admin);
        //        grantRole(CREATOR_ROLE, admin);
        //        grantRole(MINTER_ROLE, admin);
        //        grantRole(PAUSER_ROLE, admin);

        //        revokeRole(CREATOR_ROLE, admin);
        //        revokeRole(MINTER_ROLE, admin);
        //        revokeRole(PAUSER_ROLE, admin);
        revokeRole(DEFAULT_ADMIN_ROLE, _previousAdmin);

        emit AdminChanged(_previousAdmin, admin);
    }

    function uri(
        uint256 _id
    ) override public view returns (string memory) {
        require(_exists(_id), "NEXI_T");
        // We have to convert string to bytes to check for existence
        bytes memory customUriBytes = bytes(customUri[_id]);
        if (customUriBytes.length > 0) {
            return customUri[_id];
        } else {
            //            return super.uri(_id);
            return "";
        }
    }

    /**
      * @dev Returns the total quantity for a token ID
    * @param _id uint256 ID of the token to query
    * @return amount of token in existence
    */
    function totalSupply(
        uint256 _id
    ) public view returns (uint256) {
        return tokenSupply[_id];
    }

    /**
     * @dev Sets a new URI for all token types, by relying on the token type ID
    * substitution mechanism
    * https://eips.ethereum.org/EIPS/eip-1155#metadata[defined in the EIP].
   * @param _newURI New URI for all tokens
   */
    /*function setURI(
        string memory _newURI
    ) public operatorOnly {
        _setURI(_newURI);
    }*/

    /**
     * @dev Will update the base URI for the token
   * @param _tokenId The token to update. _msgSender() must be its creator.
   * @param _newURI New URI for the token.
   */
    function setCustomURI(
        uint256 _tokenId,
        string memory _newURI
    ) public creatorOnly(_tokenId) {
        customUri[_tokenId] = _newURI;
        emit URI(_newURI, _tokenId);
    }

    /**
      * @dev Creates a new token type and assigns _initialSupply to an address
    * NOTE: The token id must be passed. This allows lazy creation of tokens or
    *       creating NFTs by setting the id's high bits with the method
    *       described in ERC1155 or to use ids representing values other than
    *       successive small integers. If you wish to create ids as successive
    *       small integers you can either subclass this class to count onchain
    *       or maintain the offchain cache of identifiers recommended in
    *       ERC1155 and calculate successive ids from that.
    * @param _initialOwner address of the first owner of the token
    * @param _id The id of the token to create (must not currenty exist).
    * @param _initialSupply amount to supply the first owner
    * @param _uri Optional URI for this token type
    * @return The newly created token ID
    */
    function create(
        address _initialOwner,
        uint256 _id,
        uint256 _initialSupply,
        string memory _uri
    ) public operatorOnly
    returns (uint256) {
        require(hasRole(CREATOR_ROLE, _msgSender()), "SNC");
        require(!_exists(_id), "EXI_TID");
        creators[_id] = _msgSender();

        if (bytes(_uri).length > 0) {
            customUri[_id] = _uri;
            emit URI(_uri, _id);
        }

        _mint(_initialOwner, _id, _initialSupply, '');

        tokenSupply[_id] = _initialSupply;
        return _id;
    }

    /**
      * @dev Mints some amount of tokens to an address
    * @param _to          Address of the future owner of the token
    * @param _id          Token ID to mint
    * @param _quantity    Amount of tokens to mint
    * @param _data        Data to pass if receiver is contract
    */
    function mint(
        address _to,
        uint256 _id,
        uint256 _quantity,
        bytes memory _data
    ) virtual public override creatorOnly(_id) {
        require(hasRole(MINTER_ROLE, _msgSender()), "SNMR");
        _mint(_to, _id, _quantity, _data);
        tokenSupply[_id] = tokenSupply[_id] + _quantity;
    }

    /**
      * @dev Change the creator address for given tokens
    * @param _to   Address of the new creator
    * @param _ids  Array of Token IDs to change creator
    */
    function setCreator(
        address _to,
        uint256[] memory _ids
    ) public operatorOnly {
        require(_to != address(0), "INV_ADD");

        _grantRole(CREATOR_ROLE, _to);
        _grantRole(MINTER_ROLE, _to);
        for (uint256 i = 0; i < _ids.length; i++) {
            uint256 id = _ids[i];
            _setCreator(_to, id);
        }
    }

    /**
      * @dev Change the creator address for given token
    * @param _to   Address of the new creator
    * @param _id  Token IDs to change creator of
    */
    function _setCreator(address _to, uint256 _id) internal creatorOnly(_id)
    {
        creators[_id] = _to;
    }

    /**
      * @dev Returns whether the specified token exists by checking to see if it has a creator
    * @param _id uint256 ID of the token to query the existence of
    * @return bool whether the token exists
    */
    function _exists(
        uint256 _id
    ) internal view returns (bool) {
        return creators[_id] != address(0);
    }

    function exists(
        uint256 _id
    ) external view returns (bool) {
        return _exists(_id);
    }

    function getCreator(uint256 id)
    public
    view
    returns (address sender)
    {
        return creators[id];
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155PresetMinterPauser, IERC165) returns (bool) {
        return
        interfaceId == type(IERC1155Tradable).interfaceId ||
        super.supportsInterface(interfaceId);
    }
}
