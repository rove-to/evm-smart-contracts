// ethereum/scripts/deploy.js
const {ethers} = require("hardhat");

// get now
const now = new Date();
const addresses = [
    '0xF61234046A18b07Bf1486823369B22eFd2C4507F',
    '0xdD3B4d6aCfDE5Ee45dB3eF933204E3388C0C2930',
    '0x095442A025B1772093473b018ec9A9c427E6e806',
    '0x8748610D04C99AB70B7b5938efd3EF72768D7256'
];
function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes*60000);
}
async function deploy_rove_token(network) {
    console.log("now:" + now);
    
    console.log("DEPLOY network: ", network);
    
    // DEPLOY ROVE token
    console.log("** DEPLOY ROVE token **")
    const RoveToken = await ethers.getContractFactory("RoveToken");
    const RoveTokenDeploy = await RoveToken.deploy(process.env.PUBLIC_KEY);
    console.log("Rove Token deployed:", RoveTokenDeploy.address);

    Date.prototype.addMinutes = function (m) {
        this.setTime(this.getTime() + (m * 60 * 1000));
        return this;
    }

    /** DEPLOY 4 ROVE TOKEN LOCK TIME */
    console.log("** DEPLOY 4 ROVE TOKEN LOCK TIME **")
    var roveTokenlockTime = [];
    const RoveTokenTimelock1 = await ethers.getContractFactory("RoveTokenTimelock");
    const lock1 = addMinutes(now, 10);
    const RoveTokenTimelockDeploy1 = await RoveTokenTimelock1.deploy(
        RoveTokenDeploy.address,
        addresses,
        lock1.getTime(),
    );
    const RoveTokenTimelockDeploy1Address1 = RoveTokenTimelockDeploy1.address;
    console.log("Rove Time lock 1st year deployed: ", RoveTokenTimelockDeploy1Address1, lock1);
    roveTokenlockTime.push(RoveTokenTimelockDeploy1Address1);

    const RoveTokenTimelock2 = await ethers.getContractFactory("RoveTokenTimelock");
    const lock2 = addMinutes(now, 15);
    const RoveTokenTimelockDeploy2 = await RoveTokenTimelock2.deploy(
        RoveTokenDeploy.address,
        addresses,
        lock2.getTime(),
    );
    const RoveTokenTimelockDeploy1Address2 = RoveTokenTimelockDeploy2.address;
    console.log("Rove Time lock 2nd year deployed ", RoveTokenTimelockDeploy1Address2, lock2);
    roveTokenlockTime.push(RoveTokenTimelockDeploy1Address2);

    const RoveTokenTimelock3 = await ethers.getContractFactory("RoveTokenTimelock");
    const lock3 = addMinutes(now, 20);
    const RoveTokenTimelockDeploy3 = await RoveTokenTimelock3.deploy(
        RoveTokenDeploy.address,
        addresses,
        lock3.getTime(),
    );
    const RoveTokenTimelockDeploy1Address3 = RoveTokenTimelockDeploy3.address;
    console.log("Rove Time lock 3rd year deployed:", RoveTokenTimelockDeploy1Address3, lock3);
    roveTokenlockTime.push(RoveTokenTimelockDeploy1Address3);

    const RoveTokenTimelock4 = await ethers.getContractFactory("RoveTokenTimelock");
    const lock4 = addMinutes(now, 25);
    const RoveTokenTimelockDeploy4 = await RoveTokenTimelock4.deploy(
        RoveTokenDeploy.address,
        addresses,
        lock4.getTime(),
    );
    const RoveTokenTimelockDeploy1Address4 = RoveTokenTimelockDeploy4.address;
    console.log("Rove Time lock 4th year deployed: ", RoveTokenTimelockDeploy1Address4, lock4);
    roveTokenlockTime.push(RoveTokenTimelockDeploy1Address4);
    
    console.log("List roveTokenlockTime array", roveTokenlockTime)
}

deploy_rove_token(process.env.NETWORK)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
