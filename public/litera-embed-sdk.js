(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Litera = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_CDN = 'https://cdn.literaa.xyz/';
  var DEFAULT_API = 'https://literaa.xyz';
  var ERC1155_CONTRACT = '0x753b9F10ACF325310323C86b8BdD1C5A1C00691c';

  return {
    config: {
      cdnBase: DEFAULT_CDN,
      apiBase: DEFAULT_API,
      contractAddress: ERC1155_CONTRACT,
      chainId: 137
    },

    /**
     * Resolve an article URL to its Litera NFT tokenId and metadata
     * @param {string} articleUrl - Full URL of the article
     * @param {Object} [options] - Options override (apiBase)
     * @returns {Promise<Object>} ResolveResult
     */
    resolve: function (articleUrl, options) {
      options = options || {};
      var apiBase = options.apiBase || this.config.apiBase;
      var endpoint = apiBase + '/api/v1/articles/resolve?url=' + encodeURIComponent(articleUrl);
      
      return fetch(endpoint)
        .then(function (res) {
          if (!res.ok) throw new Error('Litera SDK resolve error: HTTP ' + res.status);
          return res.json();
        });
    },

    /**
     * Mount the Litera NFT Publishing Widget into a DOM container
     * @param {string|HTMLElement} selector - CSS selector or element target (optional, litera-embed auto-creates if missing)
     * @param {Object} [options] - Options (articleUrl, title, cdnBase)
     * @returns {HTMLElement|null}
     */
    mount: function (selector, options) {
      options = options || {};
      var target = null;
      if (selector) {
        target = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (target && !document.getElementById('my-react-plugin-root')) {
          target.id = 'my-react-plugin-root';
        }
      }

      var cdnBase = options.cdnBase || this.config.cdnBase;
      
      // Avoid double injection
      if (document.getElementById('litera-sdk-embed-script')) {
        return target;
      }

      var s = document.createElement('script');
      s.id = 'litera-sdk-embed-script';
      s.src = cdnBase + 'litera-embed.js';
      s.async = true;
      if (options.articleUrl) s.dataset.articleUrl = options.articleUrl;
      if (options.title) s.dataset.title = options.title;
      
      document.body.appendChild(s);
      return target;
    },

    /**
     * Generate canonical OpenSea URL for a given Litera NFT token
     * @param {string|number} tokenId - Token ID on Polygon Mainnet
     * @param {string} [contractAddress] - Optional contract override
     * @returns {string} OpenSea URL
     */
    getOpenSeaUrl: function (tokenId, contractAddress) {
      var address = contractAddress || this.config.contractAddress;
      return 'https://opensea.io/assets/polygon/' + address + '/' + tokenId;
    }
  };
}));
