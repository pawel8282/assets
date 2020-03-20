const { execSync } = require('child_process');
const path = require('path')
const Web3 = require('web3')
const web3 = new Web3('ws://localhost:8546');
import { ethSidechains, readDirSync } from "../src/test/helpers"

ethSidechains.forEach(chain => {
    const assetsPath = path.resolve(`${__dirname}/../blockchains/${chain}/assets`) 
    const chainAddresses = readDirSync(assetsPath)

    chainAddresses.forEach(addr => {
        const isChecksum = web3.utils.checkAddressChecksum(addr)

        if (!isChecksum) {
            console.log(`Renaming non checksum ${addr} ...`)
            const checksum = web3.utils.toChecksumAddress(addr)
            const moveToChecksum = `git mv ${addr} ${checksum}-temp && git mv ${checksum}-temp ${checksum}`
            const renamed = execSync(`cd ${assetsPath} && ${moveToChecksum}`, {encoding: "utf-8"})
            console.log(`   Result renaming ${addr} : ${renamed}`)
        }
    })
});