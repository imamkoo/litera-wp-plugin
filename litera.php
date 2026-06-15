<?php
/**
 * Plugin Name: Litera
 * Plugin URI: https://app.litera.id/
 * Description: Litera helps content creators promote and monetize their content. They can create NFT-s that their audience can mint, as well as award their audience with reward points If a creator sets a secret URL, then only viewers who have NFTs can see the hidden page. This hidden page can be hidden content.
 * Author: Litera
 * Author URI: https://litera.id
 * Text Domain: litera
 * Domain Path: /languages
 * Version: 1.0.2
 *
 * @package Litera_Plugin
 */

// Your code starts here.

// === AUTO-UPDATE VIA GITHUB RELEASES ===
if (file_exists(plugin_dir_path(__FILE__) . 'includes/class-litera-updater.php')) {
    require_once plugin_dir_path(__FILE__) . 'includes/class-litera-updater.php';

    new Litera_GitHub_Updater(
        __FILE__,
        'imamkoo',          // GitHub username
        'litera-wp-plugin'  // GitHub repository name
    );
}

// Check if the shortcode is used on a single post page
function my_react_plugin_enqueue_scripts() {
    if (is_single()) {
        $bundle_path = plugin_dir_path(__FILE__) . 'bundle.js';

        // Safety check: only enqueue if bundle.js actually exists
        if (!file_exists($bundle_path)) {
            return;
        }

        wp_enqueue_script('my-react-plugin-script', plugin_dir_url(__FILE__) . 'bundle.js', [], filemtime($bundle_path), true);

        global $post;
        $permalink = esc_url(get_permalink($post->ID));
        $title = esc_attr(get_the_title($post->ID));

        // Pass both permalink and title to the JavaScript code
        wp_localize_script('my-react-plugin-script', 'myReactPluginData', array(
            'permalink' => $permalink,
            'title' => $title,
        ));
    }
}
add_action('wp_enqueue_scripts', 'my_react_plugin_enqueue_scripts');

// Allow users to place [litera_widget] anywhere in their post
function litera_widget_shortcode() {
    if (is_single()) {
        return '<div id="my-react-plugin-root"></div>';
    }
    return '';
}
add_shortcode('litera_widget', 'litera_widget_shortcode');
add_shortcode('litera', 'litera_widget_shortcode'); // UX Improvement alias
add_shortcode('litera_premium', 'litera_widget_shortcode'); // UX Improvement alias

// Automatically append to content if shortcode is not used
function my_react_plugin_add_button_after_post_content($content) {
    if (is_single()) {
        // Check all shortcode variants to avoid duplicate widget
        $has_shortcode = (
            strpos($content, '[litera_widget]') !== false ||
            strpos($content, '[litera]') !== false ||
            strpos($content, '[litera_premium]') !== false ||
            has_shortcode($content, 'litera_widget') ||
            has_shortcode($content, 'litera') ||
            has_shortcode($content, 'litera_premium')
        );

        if (!$has_shortcode) {
            $button = '<div id="my-react-plugin-root"></div>';
            return $content . $button;
        }
    }
    return $content;
}
add_filter('the_content', 'my_react_plugin_add_button_after_post_content');