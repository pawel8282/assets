const eztz = require('eztz-lib')

import {
    Binance, Cosmos, Tezos, Tron, IoTeX, Waves,
    ethSidechains,
    chainsFolderPath,
    pricingFolderPath,
    getChainLogoPath,
    getChainAssetsPath,
    getChainAssetLogoPath,
    getChainValidatorsAssets,
    getChainValidatorsListPath,
    getChainValidatorAssetLogoPath,
    readDirSync,
    isPathExistsSync,
    readFileSync,
    isLowerCase,
    isChecksum,
    getBinanceBEP2Symbols,
    isTRC10, isTRC20,
    isLogoOK,
    getChainWhitelistPath,
    getChainBlacklistPath,
    mapList,
    findFiles,
    isValidJSON,
    isValidatorHasAllKeys,
    getChainAssetPath,
    rootDirAllowedFiles,
    assetFolderAllowedFiles
} from "./helpers"
import { ValidatorModel } from "./models";
import { getHandle } from "../../script/gen_info";
enum TickerType {
    Token = "token",
    Coin = "coin"
}

describe("Check repository root dir", () => {
    const dirActualFiles = readDirSync(".")
    test("Root should contains only predefined files", () => {
        dirActualFiles.forEach(file => {
            expect(rootDirAllowedFiles.indexOf(file), `File "${file}" should not be in root or added to predifined list`).not.toBe(-1)
        })
    })
})

describe(`Test "blockchains" folder`, () => {
    const foundChains = readDirSync(chainsFolderPath)

    test(`Chain should have "logo.png" image`, () => {
        foundChains.forEach(chain => {
            const chainLogoPath = getChainLogoPath(chain)
            expect(isPathExistsSync(chainLogoPath), `File missing at path "${chainLogoPath}"`).toBe(true)
            const [isOk, msg] = isLogoOK(chainLogoPath)
            expect(isOk, msg).toBe(true)
        })
    })

    test("Chain folder must have lowercase naming", () => {
        foundChains.forEach(chain => {
            expect(isLowerCase(chain), `Chain folder must be in lowercase "${chain}"`).toBe(true)
        })
    })

    describe(`Asset folder should contain only predifind list of filees`, () => {
        readDirSync(chainsFolderPath).forEach(chain => {
            const assetsPath = getChainAssetsPath(chain)

            if (isPathExistsSync(assetsPath)) {
                test(`Test asset folder allowed files on chain: ${chain}`, () => {
                readDirSync(assetsPath).forEach(address => {
                    const assetFiles = getChainAssetPath(chain, address)
                    readDirSync(assetFiles).forEach(assetFolderFile => {
                        expect(assetFolderAllowedFiles.indexOf(assetFolderFile),`File "${assetFolderFile}" not allowed at this path`).not.toBe(-1)
                    })
                }) 
            })
            }  
        })
    })

    describe("Check Ethereum side-chain folders", () => {
        ethSidechains.forEach(chain => {
            test(`Test chain ${chain} folder`, () => {
                const assetsPath = getChainAssetsPath(chain)

                readDirSync(assetsPath).forEach(addr => {
                    const checksum: boolean = isChecksum(addr)
                    expect(checksum, `Address ${addr} on chain ${chain} must be in checksum`).toBe(true)
                    
                    const lowercase: boolean = isLowerCase(addr)
                    if (lowercase) {
                        expect(checksum, `Lowercase address ${addr} on chain ${chain} should be in checksum`).toBe(true)
                    }

                    const assetLogoPath = getChainAssetLogoPath(chain, addr)
                    expect(isPathExistsSync(assetLogoPath), `Missing file at path "${assetLogoPath}"`).toBe(true)
                    const [isOk, msg] = isLogoOK(assetLogoPath)
                    expect(isOk, msg).toBe(true)
                })
            })
        })
    })

    describe(`Check "binace" folder`, () => {
        it("Asset must exist on chain and", async () => {
            const tokenSymbols = await getBinanceBEP2Symbols()
            const assets = readDirSync(getChainAssetsPath(Binance))

            assets.forEach(asset => {
                expect(tokenSymbols.indexOf(asset), `Asset ${asset} missing on chain`).not.toBe(-1)
            })
        })
    })

    describe(`Check "tron" folder`, () => {
        const path = getChainAssetsPath(Tron)

        test("Expect asset to be TRC10 or TRC20", () => {
            readDirSync(path).forEach(asset => {
                expect(isTRC10(asset) || isTRC20(asset), `Asset ${asset} non TRC10 nor TRC20`).toBe(true)

                const assetsLogoPath = getChainAssetLogoPath(Tron, asset)
                expect(isPathExistsSync(assetsLogoPath), `Missing file at path "${assetsLogoPath}"`).toBe(true)
                const [isOk, msg] = isLogoOK(assetsLogoPath)
                expect(isOk, msg).toBe(true)
            })
        })
    })

    describe("Check Staking chains", () => {
        const stakingChains = [Tezos, Cosmos, IoTeX, Tron, Waves]

        test("Make sure tests added for new staking chain", () => {
            expect(stakingChains.length).toBe(5)
        })

        stakingChains.forEach(chain => {
            const validatorsList = JSON.parse(readFileSync(getChainValidatorsListPath(chain)))
            test(`Make sure ${chain} validators list has correct structure`, () => {
                validatorsList.forEach((val: ValidatorModel) => {
                    expect(isValidatorHasAllKeys(val), `Come key and/or type missing for validator ${JSON.stringify(val)}`).toBe(true)
                })
            })

            
            test(`Chain ${chain} validator must have corresponding asset logo`, () => {
                validatorsList.forEach(({ id }) => {
                    const path = getChainValidatorAssetLogoPath(chain, id)
                    expect(isPathExistsSync(path), `Chain ${chain} asset ${id} logo must be present at path ${path}`).toBe(true)
                    
                    const [isOk, msg] = isLogoOK(path)
                    expect(isOk, msg).toBe(true)
                })
            })

            const chainValidatorsAssetsList = getChainValidatorsAssets(chain)
            switch (chain) {
                case Cosmos:
                    testCosmosValidatorsAddress(chainValidatorsAssetsList)
                    break;
                case Tezos:
                    testTezosValidatorsAssets(chainValidatorsAssetsList)
                    break;
                case Tron:
                    testTronValidatorsAssets(chainValidatorsAssetsList)
                    break;
                // TODO Add LOOM
                // TODO Add Waves
                // TODO Add IoTex
                default:
                    break;
            }
            
            test("Make sure validator has corresponding logo", () => {
                validatorsList.forEach(val => {
                    expect(chainValidatorsAssetsList.indexOf(val.id), `Expecting image asset for validator ${val.id} on chain ${chain}`)
                        .toBeGreaterThanOrEqual(0)
                })
            })

            test("Make sure validator asset logo has corresponding info", () => {
                chainValidatorsAssetsList.forEach(valAssetLogoID => {
                    expect(validatorsList.filter(v => v.id === valAssetLogoID).length, `Expect validator logo ${valAssetLogoID} to have info`)
                        .toBe(1)
                })
            })
        })
    })
})

function testTezosValidatorsAssets(assets) {
    test("Tezos assets must be correctly formated tz1 address", () => {
        assets.forEach(addr => {
            expect(eztz.crypto.checkAddress(addr), `Ivalid Tezos address: ${addr}`).toBe(true)
        })
    })
}

function testTronValidatorsAssets(assets) {
    test("TRON assets must be correctly formated", () => {
        assets.forEach(addr => {
            expect(isTRC20(addr), `Address ${addr} should be TRC20`).toBe(true)
        })
    })
}

function testCosmosValidatorsAddress(assets) {
    test("Cosmos assets must be correctly formated", () => {
        assets.forEach(addr => {
            expect(addr.startsWith("cosmosvaloper1"), `Address ${addr} should start from "cosmosvaloper1"`).toBe(true)
            expect(addr.length, `Address ${addr} should have length 52`).toBe(52)
            expect(isLowerCase(addr), `Address ${addr} should be in lowercase`).toBe(true)
        })
    })
}

describe("Test Coinmarketcap mapping", () => {
    const cmcMap = JSON.parse(readFileSync("./pricing/coinmarketcap/mapping.json"))

    test("Must have items", () => {
        expect(cmcMap.length, `CMC map must have items`).toBeGreaterThan(0)
    })

    test(`Items must be sorted by "id" in ascending order`, () => {
        cmcMap.forEach((el, i) => {
            if (i > 0) {
                const prevID = cmcMap[i - 1].id
                const curID = el.id
                expect(curID, `Item ${curID} must be greather or equal to ${prevID}`)
                    .toBeGreaterThanOrEqual(prevID)
            }
        })
    })

    test(`Items must be sorted by "coin" in ascending order if have same "id"`, () => {
        cmcMap.forEach((el, i) => {
            if (i > 0) {
                const prevEl = cmcMap[i - 1]

                const prevCoin = prevEl.coin
                const prevID = cmcMap[i - 1].id

                const curCoin = el.coin
                const curID = el.id

                if (prevID == curID) {
                    expect(curCoin, `Item ${JSON.stringify(el)} must be greather or equal to ${JSON.stringify(prevEl)}`)
                        .toBeGreaterThanOrEqual(prevCoin)
                }

            }
        })
    })

    test("Properies value shoud not contain spaces", () => {
        cmcMap.forEach(el => {
            Object.keys(el).forEach(key => {
                const val = el[key]
                if (typeof val === "string") {
                    expect(val.indexOf(" ") >= 0, ` Property value "${val}" should not contain space`).toBe(false)
                }
            })
        })
    });
    
    test("Params should have value and correct type", () => {
        cmcMap.forEach(el => {
            const {coin, type, id, token_id} = el
            
            expect(typeof coin, `Coin ${coin} must be type "number"`).toBe("number")

            expect(["token", "coin"], `Element with id ${id} has wrong type: "${type}"`).toContain(type)
            if (type === "token") {
                expect(token_id, `token_id ${token_id} with id ${id} must be type not empty`).toBeTruthy()
            }

            if (type === "coin") {
                expect(el, `Element with id ${id} should not have property "token_id"`).not.toHaveProperty("token_id")
            }
        });
    });

    test(`"token_id" should be in correct format`, async () => {
        const tokenSymbols = await getBinanceBEP2Symbols()

        cmcMap.forEach(el => {
            const {coin, token_id, type, id} = el
            switch (coin) {
                case 60 && type === TickerType.Token:
                    expect(isChecksum(token_id), `"token_id" ${token_id} with id ${id} must be in checksum`).toBe(true)
                    break;
                case 195 && type === TickerType.Token:
                    expect(isTRC10(token_id) || isTRC20(token_id), `"token_id" ${token_id} with id ${id} must be in TRC10 or TRC20`).toBe(true)
                    break;
                case 714 && type === TickerType.Token:
                    expect(tokenSymbols.indexOf(token_id), `"token_id" ${token_id} with id ${id} must be BEP2 symbol`).toBe(true)
                default:
                    break;
            }
        })
    })
})

describe("Test blacklist and whitelist", () => {
    const assetsChains = readDirSync(chainsFolderPath).filter(chain => isPathExistsSync(getChainAssetsPath(chain)))

    assetsChains.forEach(chain => {
        const whiteList = JSON.parse(readFileSync(getChainWhitelistPath(chain)))
        const blackList = JSON.parse(readFileSync(getChainBlacklistPath(chain)))

        const whitelistMap = mapList(whiteList)
        const blacklistMap = mapList(blackList)

        test(`Whitelist should not contain assets from blacklist on ${chain} chain`, () => {
            whiteList.forEach(a => {
                const isWhitelistInBlacklist = blacklistMap.hasOwnProperty(a)
                expect(isWhitelistInBlacklist, `Found whitelist asset ${a} in blacklist on chain ${chain}`).toBe(false)
            })
        })

        test(`Blacklist should not contain assets from whitelist on ${chain} chain`, () => {
            blackList.forEach(a => {
                const isBlacklistInWhitelist = whitelistMap.hasOwnProperty(a)
                expect(isBlacklistInWhitelist, `Found blacklist asset ${a} in whitelist on chain ${chain}`).toBe(false)
            })
        })
    })
})

describe("Test coins info.json file", () => {
    
});

describe("Test all JSON files to have valid content", () => {

    const files = [
        ...findFiles(chainsFolderPath, 'json'),
        ...findFiles(pricingFolderPath, 'json')
    ]

    files.forEach(file => { 
        expect(isValidJSON(file), `${file} path contains invalid JSON`).toBe(true)
    });
})

describe("Test helper functions", () => {
    test(`Test getHandle`, () => {
        const urls = [
            {
                url: "https://twitter.com/aeternity",
                expected: "aeternity"
            },
            {
                url: "https://www.reddit.com/r/Aeternity",
                expected: "Aeternity"
            }
        ]

        urls.forEach(u => {
            expect(getHandle(u.url), `Getting handle from url ${u}`).toBe(u.expected)
        })
    })
});

