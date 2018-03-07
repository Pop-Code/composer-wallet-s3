/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { getStore } from '../src/index'
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'

chai.should()
chai.use(chaiAsPromised)

const emptyBucket = async wallet => {
    const { Contents } = await wallet.client.listObjectsV2({ Bucket: wallet.options.bucketName }).promise()
    for (const data of Contents) {
        await wallet.client.deleteObject({ Bucket: wallet.options.bucketName, Key: data.Key }).promise()
    }
}

describe('Composer wallet S3 implementation', () => {
    describe('Bad config', () => {

        it('should fail to create with empty config', () => {
            (function () {
                getStore()
            }).should.throw(Error)
        })

        it('should fail to create with empty bucketName config', () => {
            (function () {
                getStore({
                    "namePrefix": "cards"
                })
            }).should.throw(Error)
        })

        it('should fail to create with empty namePrefix config', () => {
            (function () {
                getStore({
                    "bucketName": "test"
                })
            }).should.throw(Error)
        })
    })

    describe('Simple Path', () => {
        let wallet
        const config = {
            bucketName: 'test-composer-wallet-s3',
            namePrefix: 'namePrefix-test'
        }

        before(async () => {
            wallet = getStore(config)
            await wallet.client.createBucket({ Bucket: config.bucketName }).promise()
        })

        afterEach(async () => {
            await emptyBucket(wallet)
        })

        after(async () => {
            await wallet.client.deleteBucket({ Bucket: config.bucketName }).promise()
        })

        describe('wallet.listNames', () => {
            it('should return empty list', async () => {
                const result = await wallet.listNames()
                return expect(result).to.be.an('array').that.is.empty
            })

            it('should return correctly populated array for several elements', async () => {
                await wallet.put('Batman-Original', 'Breathe in your fears. Face them. To conquer fear, you must become fear.')
                await wallet.put('Batman-Reloaded', 'It\'s not who I am underneath, but what I do that defines me')

                const result = await wallet.listNames()
                expect(result).to.be.an('array')
                expect(result.length).to.equal(2)
                expect(result).to.have.deep.members(['Batman-Original', 'Batman-Reloaded'])
            })
        })

        describe('wallet.getAll', async () => {
            it('should return empty map for nothing present', async () => {
                let result = await wallet.getAll()
                expect(result).to.be.an('map')
                expect(result.size).to.equal(0)
            })
            it('should return correctly populated map for several elements', async () => {
                await wallet.put('Batman-Original', 'Breathe in your fears. Face them. To conquer fear, you must become fear.')
                await wallet.put('Batman-Reloaded', 'It\'s not who I am underneath, but what I do that defines me')

                let result = await wallet.getAll()
                expect(result).to.be.an('map')
                expect(result.size).to.equal(2)
                expect(result.get('Batman-Original')).to.equal('Breathe in your fears. Face them. To conquer fear, you must become fear.')
                expect(result.get('Batman-Reloaded')).to.equal('It\'s not who I am underneath, but what I do that defines me')
            })
        })

        describe('wallet.get', async () => {
            it('should return reject for nothing present', async () => {
                return wallet.get('nonexistant').should.eventually.be.rejectedWith(/does not exist/)
            })
            it('should return correct error for missing key name', async () => {
                return wallet.get().should.eventually.be.rejectedWith(/Name must be specified/)
            })
        })

        describe('wallet.contains', async () => {
            it('should return correct error for missing key name', async () => {
                return wallet.contains().should.eventually.be.rejectedWith(/Name must be specified/)
            })

            it('should return false for nothing present', async () => {
                return wallet.contains('nonexistant').should.eventually.be.false
            })

            it('should return false for nothing present', async () => {
                await wallet.put('IExist', 'I think therefore I\'ve got a headache')
                return wallet.contains('IExist').should.eventually.be.true
            })
        })

        describe('wallet.remove', async () => {
            it('should return correct error for missing key name', async () => {
                return wallet.remove().should.eventually.be.rejectedWith(/Name must be specified/)
            })

            it('should return without error for those that don\'t exist', async () => {
                return wallet.remove('nonexistant').should.eventually.be.fulfilled
            })

            it('should return false for nothing present', async () => {
                await wallet.put('IExist', 'I think therefore I\'ve got a headache')
                await wallet.remove('IExist')
                return wallet.contains('IExist').should.eventually.be.false
            })
        })

        describe('wallet.put', async () => {
            it('should return correct error for missing key name', async () => {
                return wallet.put().should.eventually.be.rejectedWith(/Name must be specified/)
            })

            it('should put a string and get it back', async () => {
                await wallet.put('Batman', 'Breathe in your fears. Face them. To conquer fear, you must become fear.')
                let result = await wallet.get('Batman')
                return expect(result).to.equal('Breathe in your fears. Face them. To conquer fear, you must become fear.')
            })

            it('should put twice with second overwriting', async () => {
                await wallet.put('Batman', 'Breathe in your fears. Face them. To conquer fear, you must become fear.')
                await wallet.put('Batman', 'It\'s not who I am underneath, but what I do that defines me')
                let result = await wallet.get('Batman')
                return expect(result).to.equal('It\'s not who I am underneath, but what I do that defines me')
            })

            it('should put a Buffer and get it back', async () => {
                // Creates a Buffer containing [0x1, 0x2, 0x3].
                const buffer = Buffer.from([1, 2, 3])
                await wallet.put('Batman', buffer)
                let result = await wallet.get('Batman')
                expect(result).to.deep.equal(buffer)
            })
            it('should put a Buffer and get it back', async () => {
                // Creates a Buffer containing [0x1, 0x2, 0x3].
                const buffer = Buffer.from([1, 2, 3])
                const buffer2 = Buffer.from([4, 5, 6])
                await wallet.put('Batman', buffer)
                await wallet.put('Batman', buffer2)
                let result = await wallet.get('Batman')
                expect(result).to.deep.equal(buffer2)
            })
            it('should reject other types', async () => {
                let Umbrella = class Umbrella { }
                return wallet.put('ThePenguin', new Umbrella()).should.be.rejectedWith('Unkown type being stored')
            })
        })
    })

    describe('Two Concurrent Wallets Path', () => {
        let walletA
        let walletB
        const configA = {
            bucketName: 'test-composer-wallet-s3-A',
            namePrefix: 'namePrefix-test'
        }
        const configB = {
            bucketName: 'test-composer-wallet-s3-B',
            namePrefix: 'namePrefix-test'
        }

        before(async () => {
            walletA = getStore(configA)
            await walletA.client.createBucket({ Bucket: configA.bucketName }).promise()

            walletB = getStore(configB)
            await walletB.client.createBucket({ Bucket: configB.bucketName }).promise()
        })

        afterEach(async () => {
            await emptyBucket(walletA)
            await emptyBucket(walletB)
        })

        after(async () => {
            await walletA.client.deleteBucket({ Bucket: configA.bucketName }).promise()
            await walletB.client.deleteBucket({ Bucket: configB.bucketName }).promise()
        })

        it('should be able to put the same key in both without cross-contamination', async () => {
            await walletA.put('Batman', 'Breathe in your fears. Face them. To conquer fear, you must become fear.');
            await walletB.put('Batman', 'It\'s not who I am underneath, but what I do that defines me');
            let resultA = await walletA.get('Batman');
            expect(resultA).to.equal('Breathe in your fears. Face them. To conquer fear, you must become fear.');
            let resultB = await walletB.get('Batman');
            expect(resultB).to.equal('It\'s not who I am underneath, but what I do that defines me');
        });
    });
})