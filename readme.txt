=== Litera Web3 Plugin ===
Contributors: litera
Tags: web3, nft, polygon, monetization, content creator
Requires at least: 5.6
Tested up to: 6.4
Requires PHP: 7.4
Stable tag: 1.4.5
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Litera helps content creators promote and monetize their content using Web3 technology on the Polygon blockchain.

== Description ==

Litera is a revolutionary Web3 plugin designed to empower content creators. By integrating blockchain technology directly into your WordPress site, you can unlock new monetization models and build a dedicated community.

With Litera, you can:
* Create NFTs that your audience can mint.
* Award your audience with reward points and tokens.
* Set secret URLs and hidden pages that are only accessible to users who hold a specific NFT (Token Gating).
* Create interactive Quizzes as "Proof of Completion" to reward your engaged readers.

Join the Web3 revolution and give your readers true ownership while monetizing your hard work.

== Installation ==

1. Upload the `litera-wp-plugin.zip` file to the `/wp-content/plugins/` directory, or install the plugin directly through the WordPress plugins screen.
2. Activate the plugin through the 'Plugins' screen in WordPress.
3. Use the Litera Dashboard (https://app.litera.id) to connect your MetaMask wallet and configure your articles.
4. Copy the generated Shortcode from the Litera Dashboard and paste it into any WordPress post or page to enable the Web3 features.

== Frequently Asked Questions ==

= Do I need a MetaMask wallet to use this? =
Yes, as a Publisher, you need a MetaMask or compatible Web3 wallet to sign transactions and configure your NFTs on the Polygon network.

= Are my readers required to pay gas fees? =
Readers minting NFTs will need a small amount of POL (MATIC) for gas fees, unless a gasless relayer system is active.

== Screenshots ==

1. The Litera unlock screen shown to readers.

== Changelog ==

= 1.1.6 =
* UI: Remove NFT supply stats, add Publisher & Author info, restore LITE balance in connected state

= 1.1.5 =
* Enh: Add wallet parameter to Authorization redirect for cross-domain UX sync

= 1.1.4 =
* Restored premium dark mode UI from v1.0.21 while maintaining thin client logic

= 1.1.3 =
* Fix: Decrypt button now redirects directly to the specific NFT page on Dashboard instead of general My NFT page.

= 1.1.2 =
* UI Redesign: Minimalist and slim widget design for better theme compatibility.

= 1.1.1 =
* Major Architecture Update: Plugin transformed into a Thin Client.
* Removed local Web3 transaction dependencies (Wagmi/Viem) to improve performance and compatibility.
* Moved Authorization (Quiz) and Minting logic to the central Dashboard (literaa.xyz) for enhanced security and persistent sessions.
* Cross-Platform Continuity: Readers are seamlessly redirected to the Dashboard to unlock content and then returned to the article.
* Redesigned Litera Widget UI with premium Glassmorphism and better user flows for unlocking content.

= 1.0.3 =
* Implement Wallet Signature Authentication (EIP-712).
* Add Quiz configuration with configurable Passing Score.
* General bug fixes and stability improvements.

= 1.0.0 =
* Initial release of Litera Web3 Plugin.
