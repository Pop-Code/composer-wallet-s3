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

import path from 'path'
import AWS from 'aws-sdk'
import { Wallet, Logger } from 'composer-common'

const LOG = Logger.getLog('wallet/s3')

/** 
 * @class 
 */
export default class S3Wallet extends Wallet {

    /**
     * The constructor is passed the options as configured by the user.  The JSON structure of the configuration is
     * "composer": {
     *     "wallet": {
     *         "type": "composer-wallet-s3",
     *         "desc": "Uses the amazon s3 as store",
     *         "options": {
     *             "bucketName": "alpha-metal",
     *             "s3Options": { //see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property
     *                 "version": "2006-03-01" //optional
     *             }
     *         }
     *     }
     * }
     *
     * You can also use the NODE_CONFIG env var
     * export NODE_CONFIG='{"composer":{"wallet":{"type":"composer-wallet-s3","options":{"region":"eu-central-1","bucketName":"composer-card-store"}}}}'
     * 
     * Note that the namePrefix is one option that WILL be specified by the Composer code.
     *
     * The contents of the options element are passed to this Constructore as an object
     * @param {Object} options Options for this implementations
     */
    constructor(options) {
        super()

        if (!options)
            throw new Error('S3Wallet options are required')

        if (!options.namePrefix)
            throw new Error('S3Wallet options.namePrefix is required')

        if (!options.bucketName) {
            throw new Error('S3Wallet options.bucketName is required')
        }

        this.options = options

        if (!this.options.s3Options) {
            this.options.s3Options = {
                version: '2006-03-01'
            }
        }

        LOG.info('Connecting with config', this.options.s3Options)

        this.client = new AWS.S3(this.options.s3Options)
    }

    /**
     * Get a "path name", this is not part of the interface but is used to create a suitable name
     * to achieve separation of entries
     *
     * @private
     * @param {String} name - name to use as the key
     * @return {String} full 'path' name
     */
    _path(name) {
        if (!name || name === "") {
            throw new Error('Name must be specified')
        }
        if (name.startsWith(this.options.namePrefix)) {
            return name
        } else {
            return path.join(this.options.namePrefix, name)
        }
    }

    /**
     *
     * @param {String|Buffer} value to check
     * @return {String} of mime type, or throw an error
     */
    static determineType(value) {
        if (value instanceof Buffer) {
            return 'application/octet-stream'
        } else if (value instanceof String || typeof value === 'string') {
            return 'text/plain';
        } else {
            throw new Error('Unkown type being stored')
        }
    }

    /**
     * Gets all the objects under this prefix and tag
     * An empty storage service will return a map with no contents
     *
     * @return {Promise} A Promise that is resolved with a map of the names and the values
     */
    async getAll() {
        LOG.info('getAll')

        const { Contents } = await this.client.listObjectsV2({
            Bucket: this.options.bucketName
        }).promise()

        const results = new Map();

        for (const data of Contents) {
            //we must ignore the files that are not starting with the options namePrefix because they are not cards but credentials
            if (data.Key.startsWith(this.options.namePrefix)) {
                results.set(data.Key.replace(this.options.namePrefix + path.sep, ''), await this.get(data.Key))
            }
        }

        return results
    }

    /**
     * List all of the credentials in the wallet.
     * @return {Promise} A promise that is resolved with
     * an array of credential names, or rejected with an
     * error.
     */
    async listNames() {
        LOG.info('listNames')

        const { Contents } = await this.client.listObjectsV2({
            Bucket: this.options.bucketName
        }).promise()

        return Contents.map(c => c.Key.replace(this.options.namePrefix + path.sep, ''))
    }

    /**
     * Check to see if the named credentials are in
     * the wallet.
     * @param {string} name The name of the credentials.
     * @return {Promise} A promise that is resolved with
     * a boolean; true if the named credentials are in the
     * wallet, false otherwise.
     */
    async contains(name) {
        LOG.info('contains')

        try {
            await this.client.headObject({
                Bucket: this.options.bucketName,
                Key: this._path(name)
            }).promise()
            return true
        } catch (e) {
            if (e.statusCode === 404)
                return false
            throw e
        }
    }

    /**
     * Get the named credentials from the wallet.
     * @param {string} name The name of the credentials.
     * @return {Promise} A promise that is resolved with
     * the named credentials, or rejected with an error.
     */
    async get(name) {
        LOG.info('get', name)

        const { Body, ContentType } = await this.client.getObject({
            Bucket: this.options.bucketName,
            Key: this._path(name)
        }).promise()


        if (ContentType === 'text/plain') {
            return Body.toString()
        } else {
            return Body
        }
    }

    /**
     * Add a new credential to the wallet.
     * @param {string} name The name of the credentials.
     * @param {string} value The credentials.
     * @param {Object} [meta] Optional object with meta data
     * @return {Promise} A promise that is resolved when
     * complete, or rejected with an error.
     */
    async put(name, value, meta = {}) {
        LOG.info('put', name)

        return await this.client.putObject({
            Body: value,
            Bucket: this.options.bucketName,
            Key: this._path(name),
            ContentType: this.constructor.determineType(value),
            Metadata: meta
        }).promise()
    }

    /**
     * Remove existing credentials from the wallet.
     * @param {string} name The name of the credentials.
     * @return {Promise} A promise that is resolved when
     * complete, or rejected with an error.
     */
    async remove(name) {
        LOG.info('remove', name)

        return await this.client.deleteObject({
            Bucket: this.options.bucketName,
            Key: this._path(name)
        }).promise()
    }
}