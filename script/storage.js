/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
"use strict";

/**
 * Retrieve object from Chrome's Local StorageArea
 * @param {string} key
 */
const getObjectFromLocalStorage = async function (key) {
	return new Promise((resolve, reject) => {
		try {
			if (typeof key === "string") {
				key = [key];
			}
			chrome.storage.local.get(key, function (value) {
				resolve(value[key]);
			});
		} catch (ex) {
			reject(ex);
		}
	});
};

/**
 * Save Object in Chrome's Local StorageArea
 * @param {*} obj
 */
const saveObjectInLocalStorage = async function (obj) {
	console.log(obj);
	return new Promise((resolve, reject) => {
		try {
			chrome.storage.local.set(obj, function () {
				resolve();
			});
		} catch (ex) {
			reject(ex);
		}
	});
};

/**
 * Retrieve object from Chrome's Sync StorageArea
 * @param {string} key
 */
const getObjectFromSyncStorage = async function (key) {
	return new Promise((resolve, reject) => {
		try {
			if (typeof key === "string") {
				key = [key];
			}
			chrome.storage.sync.get(key, function (value) {
				resolve(value[key]);
			});
		} catch (ex) {
			reject(ex);
		}
	});
};

/**
 * Save Object in Chrome's Sync StorageArea
 * @param {*} obj
 */
const saveObjectInSyncStorage = async function (obj) {
	return new Promise((resolve, reject) => {
		try {
			chrome.storage.sync.set(obj, function () {
				resolve();
			});
		} catch (ex) {
			reject(ex);
		}
	});
};

/**
 * Retrieve object from Chrome's Session StorageArea
 * @param {string} key
 */
const getObjectFromSessionStorage = async function (key) {
	return new Promise((resolve, reject) => {
		try {
			if (typeof key === "string") {
				key = [key];
			}
			chrome.storage.session.get(key, function (value) {
				resolve(value[key]);
			});
		} catch (ex) {
			reject(ex);
		}
	});
};

/**
 * Save Object in Chrome's Session StorageArea
 * @param {*} obj
 */
const saveObjectInSessionStorage = async function (obj) {
	return new Promise((resolve, reject) => {
		try {
			chrome.storage.session.set(obj, function () {
				resolve();
			});
		} catch (ex) {
			reject(ex);
		}
	});
};

/**
 * Retrieve object from Chrome's Managed StorageArea
 * @param {string} key
 */
const getObjectFromManagedStorage = async function (key) {
	return new Promise((resolve, reject) => {
		try {
			if (typeof key === "string") {
				key = [key];
			}
			chrome.storage.managed.get(key, function (value) {
				resolve(value[key]);
			});
		} catch (ex) {
			reject(ex);
		}
	});
};
