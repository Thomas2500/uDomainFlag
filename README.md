# <img src="images/logo-48x48.png" width="45" align="left"> uDomainFlag

[link-cws]: https://chrome.google.com/webstore/detail/udomainflag/eklbfdpploakpkdakoielobggbhemlnm "Google Chrome Web Store"
[link-mao]: https://addons.mozilla.org/en-US/firefox/addon/domain-flag/ "Mozilla Firefox Add-ons"
[link-mse]: https://microsoftedge.microsoft.com/addons/detail/fbokifoifbpkgbonofeejgodpdafpkjb "Microsoft EDGE-Add-Ons"

> Browser extension to see the location of the viewed website

uDomainFlag is an extension for various browsers and allows you to get additional information about a domain while browsing a web page.

## Installation

You can install uDomainFlag [<img valign="middle" src="https://img.shields.io/github/release/Thomas2500/uDomainFlag.svg?logo=github&style=flat-square&labelColor=333">](https://github.com/Thomas2500/uDomainFlag/releases) using various browser stores, including:
- [Google **Chrome** Web Store][link-cws] [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/eklbfdpploakpkdakoielobggbhemlnm.svg?label=%20&labelColor=333&logo=google-chrome&style=flat-square">][link-cws]
- [Mozilla **Firefox** Add-on][link-mao] [<img valign="middle" src="https://img.shields.io/amo/v/domain-flag.svg?label=%20&labelColor=333&logo=firefox&style=flat-square">][link-mao]
- [Microsoft **EDGE**-Add-On][link-mse] [<img valign="middle" src="https://img.shields.io/badge/dynamic/json?label=%20&labelColor=333&logo=microsoft-edge&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Ffbokifoifbpkgbonofeejgodpdafpkjb&style=flat-square">][link-mse]
- **Brave**, **Vivaldi** and other Chromium-based browsers can use the [Google Chrome Web Store][link-cws] extension.

Alternatively you can manually install the extension by importing it on the browser extensions page with enabled developer mode. Please see Development & contribution

## Features

- Country flag on website visit
- Special icon for internal or special resources
- Always up2date data using online lookups
- Available for most browsers
- Privacy focused without tracking
- Quick overview of additional IP addresses and contacted ASN within popup view
- GroupPolicy based settings

## Screenshots

### Public website

![Extension opened on wikipedia.org](https://media.bella.network/domainflag/wikipedia.org.png)

Expanded uDomainFlag information popup on the page wikipedia.org.

* The detected location of the server is displayed first.
* IP and Hostname contains the target server to which the browser connected to.
* The IP list below shows additional known addresses of the resolved domain which are available and can be used.
* The target network information contains the Autonomous System Number (ASN) and the description provided by the ASN operator.
* Using the link "Additional information" the webpage version of uDomainFlag will be opened with even more information.

### Internal website

![Extension opened on internal domain](https://media.bella.network/domainflag/internal.png)

View of an internal or special purpose website was opened.
* A custom icon is displayed instead of the country flag
* In addition, the internally used IP address used to connect to the server is shown.

### Settings

![Extension settings with options](https://media.bella.network/domainflag/settings.png)

* Settings page of the extension. First containing the used version and extension ID with link to changelog.
* After the introduction a link to the [HowItWorks](https://domainflag.unterhaltungsbox.com/extension/howitworks)-Page how uDomainFlag itself works and to which server uDomainFlag is connected to with the used encryption.
* The crashreporting option is enabled by default and can be disabled here. When disabling, crash reporting will be disabled for all uDomainFlag instances. If you synchronize your browser settings, this configuration option will also be synced.

## Company use

Some settings can be managed using registry keys (e.g. over GPO) on Windows, using MCX preferences on macOS or an JSON config file on Linux. An example of which settings can be configured for your users:

* **Server**: Target server to use instead of dfdata.bella.network
* **DisableCrashReports**: Turns off crash reporting and does not allow the user to enable it again.

## Releases

A list of all releases including changelog can be found at [Releases](https://github.com/Thomas2500/uDomainFlag/releases).
Depending on the store, it can take multiple days up to weeks until a new release is published everywhere.

## Webpage

uDomainFlag is also available as website at [domainflag.unterhaltungsbox.com](http://domainflag.unterhaltungsbox.com/) with some additional information. This page is opened when "additional information" is clicked within the extension.

## Development & contribution

1. Clone this repository - `git clone https://github.com/Thomas2500/uDomainFlag.git`
2. If you develop for Firefox, copy the file `/platform/firefox/manifest.json` to `/manifest.json`. For other browsers use the file `/platform/chromium/manifest.json`.
3. Enable developer mode within your browser. You can find this option in Chrome at [chrome://extensions](chrome://extensions), Firefox Add-ons [about:debugging#/runtime/this-firefox](about:debugging#/runtime/this-firefox), and Microsoft Edge Extensions [edge://extensions/](edge://extensions/).
4. Click on load unpacked extension/load temporary add-on and select the root folder or manifest.json of this cloned repository on your disk.
5. You are ready! Some changes do need an additional extension reload using the refresh symbol within the extension page from step 3.

You have found a bug or have a suggestion for a feature, then please open an [Issue on GitHub](https://github.com/Thomas2500/uDomainFlag/issues). We are also open for PRs!

## Translation
Please help to translate uDomainFlag into other language! You can use the English (`en`) / German (`de`) language files as reference which are located within the `_locales` folder.

## Permissions required

This extension uses the following permissions:
* **Read your browsing history** - Needed to determine the currently viewed website.
* **Read and change all your data on the websites you visit** - Also used to determine the viewed website and additionally to detect the used IP address of the target server. (E.g. to show if website uses a private IP address)

uDomainFlag connects primarily to [dfdata.bella.network](https://dfdata.bella.network/) for location data, where you can also find additional information about the backend.

## Privacy Policy

The full version is available at [thomas.bella.network/privacy](https://thomas.bella.network/privacy).

The extension itself logs errors using Sentry and transmits there errors to my private selfhosted sentry instance. Error logging can be disabled within the extension settings and this setting is synchronized to other instances if logged in within the browser.

> uDomainFlag collects crash reports which can be permanently disabled within the extension settings.
>
> No user data is collected or shared and server location lookups can't be traced back to a user.
>
> Any generated logs are only processed to ward off attacks and are completely removed within 48 hours.

## Open Source
This extension uses the [MPL-2.0 License](/LICENSE) license. This way the code can be verified by everyone and contributions improve the experience of every extension user.

Every change of the extension is made public here and only labeled releases from this site get published on the browser stores. There are some small changes made to match the requirements of the specific store and some files of this repository are not included. This changes are described above.
