<?php
/**
 * Plugin Name:        Litera NFT Widget
 * Description:        Memasang widget NFT Litera secara otomatis di setiap artikel/post halaman WordPress. Cukup salin file ini ke <code>wp-content/mu-plugins/</code>, selesai.
 * Version:            1.0.0
 * Requires at least:  5.0
 * Requires PHP:       7.4
 * Author:             Litera / IMKOllective
 * License:            MIT
 *
 * Cara instalasi:
 *   1. Unduh file ini
 *   2. Salin ke folder <code>wp-content/mu-plugins/</code> di server WordPress Anda
 *   3. Selesai — widget NFT Litera otomatis muncul di setiap artikel
 *
 * CATATAN:
 *   - Tidak perlu aktivasi via WP Admin — plugin langsung aktif saat file ada di folder mu-plugins.
 *   - Untuk portal lama (satuguru.id, litera.id, dll.) domainnya SUDAH terdaftar di allowlist Litera.
 *   - Jika domain Anda belum terdaftar, hubungi tim Litera: teknis@litera.id
 *   - Widget butuh koneksi internet (memanggil API Litera + RPC Polygon) — pastikan server tidak memblokir koneksi keluar.
 */

/**
 * Memuat widget NFT Litera hanya di halaman artikel (post, page, custom post type).
 *
 * Fungsi ini otomatis membaca URL artikel saat ini dan meneruskannya ke widget.
 * Tidak ada konfigurasi tambahan yang diperlukan.
 */
function litera_nft_widget_enqueue() {
    if ( is_singular() ) {
        $cdn_url = 'https://cdn.literaa.xyz/litera-embed.js';

        wp_enqueue_script(
            'litera-nft-widget',
            $cdn_url,
            array(),
            null,   // versi null = pakai cache CDN (URL CDN sudah di-manage terpisah)
            true    // footer — tidak memblokir render halaman
        );

        // Data artikel ke widget (fallback jika litera-embed gagal membaca URL)
        $permalink = get_permalink();
        $title    = get_the_title();

        wp_localize_script(
            'litera-nft-widget',
            'literaEmbedData',
            array(
                'permalink' => esc_url( $permalink ),
                'title'    => sanitize_text_field( $title ),
            )
        );
    }
}
add_action( 'wp_enqueue_scripts', 'litera_nft_widget_enqueue' );

/**
 * Opsional: Tambah jarak di sekitar container widget agar tidak menempel tema.
 * Jika widget tidak muncul rapi, hapus komentar pada fungsi di bawah.
 */
/*
function litera_nft_widget_styles() {
    if ( is_singular() ) {
        echo '<style>
            #my-react-plugin-root {
                margin-top: 2rem;
                min-height: 60px;
            }
        </style>';
    }
}
add_action( 'wp_head', 'litera_nft_widget_styles' );
*/
