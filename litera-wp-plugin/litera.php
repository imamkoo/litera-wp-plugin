<?php
/**
 * Plugin Name: Litera
 * Plugin URI: https://app.litera.id/
 * Description: Litera helps content creators promote and monetize their content. They can create NFT-s that their audience can mint, as well as award their audience with reward points If a creator sets a secret URL, then only viewers who have NFTs can see the hidden page. This hidden page can be hidden content.
 * Author: Litera
 * Author URI: https://litera.id
 * Text Domain: litera
 * Domain Path: /languages
 * Version: 1.4.5
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
    if (is_singular() || is_single()) {
        $loader_path = plugin_dir_path(__FILE__) . 'loader.js';
        $bundle_path = plugin_dir_path(__FILE__) . 'bundle.js';

        // Loader + local fallback bundle must both exist
        if (!file_exists($loader_path) || !file_exists($bundle_path)) {
            return;
        }

        wp_enqueue_script('my-react-plugin-script', plugin_dir_url(__FILE__) . 'loader.js', [], filemtime($loader_path), true);

        // Local bundle URL injected before loader runs — fallback if CDN is unreachable.
        wp_add_inline_script(
            'my-react-plugin-script',
            'window.literaLocalBundle = ' . wp_json_encode(plugin_dir_url(__FILE__) . 'bundle.js') . ';',
            'before'
        );

        global $post;
        $permalink = ($post && isset($post->ID)) ? esc_url(get_permalink($post->ID)) : esc_url(home_url($_SERVER['REQUEST_URI'] ?? ''));
        $title = ($post && isset($post->ID)) ? esc_attr(get_the_title($post->ID)) : esc_attr(wp_get_document_title());

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
    return '<div id="my-react-plugin-root"></div>';
}
add_shortcode('litera_widget', 'litera_widget_shortcode');
add_shortcode('litera', 'litera_widget_shortcode');
add_shortcode('LITERA', 'litera_widget_shortcode');
add_shortcode('litera_premium', 'litera_widget_shortcode');

// Automatically append to content if shortcode is not used
function my_react_plugin_add_button_after_post_content($content) {
    if (is_singular() || is_single()) {
        global $post, $page, $numpages;

        // Check if the shortcode exists anywhere in the ENTIRE post, not just the current page slice
        $full_post_content = $post->post_content;
        $has_shortcode = (
            strpos($full_post_content, '[litera_widget]') !== false ||
            strpos($full_post_content, '[litera]') !== false ||
            strpos($full_post_content, '[litera_premium]') !== false ||
            has_shortcode($full_post_content, 'litera_widget') ||
            has_shortcode($full_post_content, 'litera') ||
            has_shortcode($full_post_content, 'litera_premium')
        );

        // If user didn't put a shortcode anywhere, we auto-append it.
        // BUT we only auto-append it on the LAST page of the article.
        if (!$has_shortcode) {
            // $page and $numpages handle WP pagination (<!--nextpage-->)
            $current_page = $page ? $page : 1;
            $total_pages = $numpages ? $numpages : 1;

            if ($current_page >= $total_pages) {
                $button = '<div id="my-react-plugin-root"></div>';
                return $content . $button;
            }
        }
    }
    return $content;
}
add_filter('the_content', 'my_react_plugin_add_button_after_post_content');