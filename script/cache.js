/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

 // General local cache which is dropped after browser/extension restart
// remove old entries often to prevent high memory consumption and big cleanup loops
function Cache(config) {
	config = config || {};
	config.trim = config.trim || 180;
	config.ttl = config.ttl || 900;

	var data = {};
	var self = this;

	/**
	 * Returns the current (unix) time in seconds in millisecond precision
	 * @returns {float} current unix time in millisecond
	 */
	var now = function () {
		return new Date().getTime() / 1000;
	};

	/**
	 * Object for holding a value and an expiration time
	 * @param expires the expiry time as a UNIX timestamp
	 * @param value the value of the cache entry
	 */
	var CacheEntry = function (expires, value) {
		this.expires = expires;
		this.value = value;
	};

	/**
	 * Creates a new cache entry with the current time + ttl as the expiry.
	 * @param value the value to set in the entry
	 * @returns {CacheEntry} the cache entry object
	 */
	CacheEntry.create = function (value) {
		return new CacheEntry(now() + config.ttl, value);
	};

	/**
	 * Returns an Array of all currently set keys.
	 * @returns {Array} cache keys
	 */
	this.keys = function () {
		let keys = [];
		for (let key in data) {
			if (data.hasOwnProperty(key)) {
				keys.push(key);
			}
		}
		return keys;
	};

	/**
	 * Checks if a key is currently set in the cache.
	 * @param key the key to look for
	 * @returns {boolean} true if set, false otherwise
	 */
	this.has = function (key) {
		return data.hasOwnProperty(key);
	};

	/**
	 * Clears all cache entries.
	 */
	this.clear = function () {
		for (let key in data) {
			if (data.hasOwnProperty(key)) {
				self.remove(key);
			}
		}
	};

	/**
	 * Gets the cache entry for the given key.
	 * @param key the cache key
	 * @returns {*} the cache entry if set, or undefined otherwise
	 */
	this.get = function (key) {
		return data[key].value;
	};

	/**
	 * Returns the cache entry if set, or a default value otherwise.
	 * @param key the key to retrieve
	 * @param def the default value to return if unset
	 * @returns {*} the cache entry if set, or the default value provided.
	 */
	this.getOrDefault = function (key, def) {
		return self.has(key) ? data[key].value : def;
	};

	/**
	 * Sets a cache entry with the provided key and value.
	 * @param key the key to set
	 * @param value the value to set
	 */
	this.set = function (key, value) {
		data[key] = CacheEntry.create(value);
	};

	/**
	 * Removes the cache entry for the given key.
	 * @param key the key to remove
	 * @returns {boolean} the key was removed fom the cache
	 */
	this.remove = function (key) {
		return delete data[key];
	};

	/**
	 * Checks if the cache entry has expired.
	 * @param entrytime the cache entry expiry time
	 * @param curr (optional) the current time
	 * @returns {boolean} true if expired, false otherwise
	 */
	this.expired = function (entrytime, curr) {
		if (!curr) {
			curr = now();
		}
		return entrytime < curr;
	};

	/**
	 * Trims the cache of expired keys. This function is run periodically (see config.ttl).
	 */
	this.trim = function () {
		let curr = now();
		for (let key in data) {
			if (data.hasOwnProperty(key)) {
				if (self.expired(data[key].expires, curr)) {
					self.remove(key);
				}
			}
		}
	};

	// Periodic cleanup of existing data based on TTL
	setInterval(this.trim, config['trim'] * 1000);
}
