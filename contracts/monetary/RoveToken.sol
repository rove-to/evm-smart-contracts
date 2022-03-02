pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";
import "hardhat/console.sol";


contract RoveToken is ERC20PresetMinterPauser {
    event AdminChanged (address previousAdmin, address newAdmin);
    event MintToken(address to, uint256 amount);
    
    address public admin; // a multi sig address;
    address[4] public roveTokenTimelockContract;

    // Create a new role identifier for the minter role
    // admin is a multi sig address
    constructor(address _admin) ERC20PresetMinterPauser("ROVE", "RVE") {
        console.log("Deploy Rove token", "RVE");
        console.log("Mint to admin address", admin);

        uint256 _totalSupplyRove = 1000000000;

        // mint RVE for admin account
        admin = _admin;
        mint(admin, _totalSupplyRove * (10 ** uint256(decimals())));
        // set role to admin
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(MINTER_ROLE, admin);
        _setupRole(PAUSER_ROLE, admin);
        
        console.log("Total supply for admin address", _totalSupplyRove);
    }

    function decimals() public view override returns (uint8) {
        return 4;
    }

    function changeAdmin(address _newAdmin) external {
        require(msg.sender == admin, "only the operator can change the current operator");
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not a operator");
        address previousAdmin = admin;
        admin = _newAdmin;
        
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(MINTER_ROLE, admin);
        _setupRole(PAUSER_ROLE, admin);
        
        _revokeRole(DEFAULT_ADMIN_ROLE, previousAdmin);
        _revokeRole(MINTER_ROLE, previousAdmin);
        _revokeRole(PAUSER_ROLE, previousAdmin);
        emit AdminChanged(previousAdmin, admin);
    }

    // TODO: remove this func
    function mint(address to, uint256 amount) public override {
        // to is a multi sig address
        require(msg.sender == admin, "Caller is not a admin");
        // Check that the calling account has the minter role
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not a minter");
        require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter");
        _mint(to, amount);
        emit MintToken(to, amount);
    }

    function schedule_minting(address[4] memory timeLockContracts) public returns (uint256) {
        require(msg.sender == admin, "Caller is not admin");
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not admin role");

        roveTokenTimelockContract = timeLockContracts;
        uint256 total = totalSupply();
        console.log("total supply", total);

        // * Minting schedule: 
        //     - 40% 1st year
        uint256 first_year = total / 5;
        first_year = first_year * 2;
        console.log("total supply for first_year", first_year);
        require(first_year == (400000000 * (10 ** uint256(decimals()))), "RoveToken: schedule minting first_year 400000000 is invalid");
        //     - 30% 2nd year
        uint256 second_year = total / 10;
        second_year = second_year * 3;
        console.log("total supply for second_year", second_year);
        require(second_year == (300000000 * (10 ** uint256(decimals()))), "RoveToken: schedule minting second_year 300000000 is invalid");

        //     - 20% 3rd year
        uint256 third_year = total / 5;
        console.log("total supply for third_year", third_year);
        require(third_year == (200000000 * (10 ** uint256(decimals()))), "RoveToken: schedule minting third_year 200000000 is invalid");

        //     - 10% 4th year
        uint256 fourth_year = total / 10;
        console.log("total supply for fourth_year", fourth_year);
        require(fourth_year == (100000000 * (10 ** uint256(decimals()))), "RoveToken: schedule minting fourth_year 100000000 is invalid");

        uint256 temp = first_year + second_year;
        temp = temp + third_year;
        temp = temp + fourth_year;
        require(temp == total, "RoveToken: schedule minting is invalid");

        transfer(roveTokenTimelockContract[0], first_year);
        transfer(roveTokenTimelockContract[1], second_year);
        transfer(roveTokenTimelockContract[2], third_year);
        transfer(roveTokenTimelockContract[3], fourth_year);

        return temp;
    }
}