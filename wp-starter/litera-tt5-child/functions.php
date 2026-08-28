<?php
/**
 * functions.php — Litera TT5 Child Theme
 *
 * Mewarisi semua dari Twenty Twenty-Five; hanya menambahkan
 * loader widget Litera di halaman artikel.
 */

/**
 * Enqueue parent theme style.
 *
 * Block theme menggunakan theme.json, jadi parent stylesheet
 * tidak selalu diperlukan, tapi disertakan demi kompatibilitas.
 */
function litera_tt5_enqueue_styles() {
    wp_enqueue_style(
        'litera-tt5-parent',
        get_template_directory_uri() . '/style.css'
    );
    wp_enqueue_style(
        'litera-tt5-child',
        get_stylesheet_uri(),
        array( 'litera-tt5-parent' )
    );
}
add_action( 'wp_enqueue_scripts', 'litera_tt5_enqueue_styles' );

/**
 * Enqueue widget Litera hanya di halaman singular (artikel/post).
 */
function litera_tt5_enqueue_widget() {
    if ( is_singular() ) {
        wp_enqueue_script(
            'litera-embed',
            'https://cdn.literaa.xyz/litera-embed.js',
            array(),
            null,
            true
        );

        wp_localize_script(
            'litera-embed',
            'literaEmbedData',
            array(
                'permalink' => get_permalink(),
                'title'    => get_the_title(),
            )
        );
    }
}
add_action( 'wp_enqueue_scripts', 'litera_tt5_enqueue_widget' );