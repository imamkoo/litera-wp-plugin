<?php
/**
 * Plugin Name:        Litera Embed (Must-Use)
 * Description:        Memasang widget NFT Litera secara otomatis di setiap artikel/post halaman singular WordPress. Untuk situs yang tidak ingin instal plugin lengkap. Cukup salin file ini ke <code>wp-content/mu-plugins/</code>.
 * Version:            1.0.0
 * Requires at least:  5.0
 * Requires PHP:       7.4
 * Author:             Litera / IMKOllective
 * License:            MIT
 *
 * Cara instalasi:
 *   1. Unduh file ini
 *   2. Salin ke direktori <code>wp-content/mu-plugins/</code> di server WordPress Anda
 *   3. Selesai — widget Litera otomatis muncul di bawah setiap artikel/post halaman
 *
 *CATATAN PENTING:
 *   - Tidak perlu aktifkan via WP Admin — mu-plugin langsung aktif saat file ada di folder mu-plugins.
 *   - Untuk portal lama (satuguru.id, litera.id, dll.) domainnya SUDAH teregistrasi di allowlist CORS.
 *   - Jika domain Anda belum teregistrasi, hubungi tim Litera teknis@litera.id untuk didaftarkan.
 *   - Widget memerlukan koneksi internet (memanggil API Litera + RPC Polygon) — pastikan server tidak memblokir koneksi keluar.
 */

/**
 * Enqueue Litera embed script hanya pada halaman singular (post, page, custom post type).
 *
 * Fungsi ini otomatis mendeteksi URL artikel saat ini dan meneruskan ke widget Litera.
 * Tidak ada konfigurasi tambahan yang diperlukan.
 */
function litera_embed_mu_enqueue() {
    if ( is_singular() ) {
        $cdn_url = 'https://cdn.literaa.xyz/litera-embed.js';

        // Verifikasi URL CDN reachable (skip jika gagal, frontend handle error)
        // Kita tidak blocker render halaman karena widget non-critical embed.
        wp_enqueue_script(
            'litera-embed-mu',
            $cdn_url,
            array(),
            null,   // versi null = tidak di-cache bust via filemtime (CDN sudah hashed)
            true    // footer — tidak blocker render
        );

        // Kirim data article ke window (fallback jika litera-embed gagal resolve URL)
        $permalink = get_permalink();
        $title    = get_the_title();

        wp_localize_script(
            'litera-embed-mu',
            'literaEmbedData',
            array(
                'permalink' => esc_url( $permalink ),
                'title'    => sanitize_text_field( $title ),
            )
        );
    }
}
add_action( 'wp_enqueue_scripts', 'litera_embed_mu_enqueue' );

/**
 * Optional: Tambah inline style supaya container widget tidak clash dengan tema.
 * Jika widget Litera tidak muncul dengan benar, aktifkan baris di bawah
 * dengan menghapus karakter // di awal baris.
 */
/*
function litera_embed_mu_styles() {
    if ( is_singular() ) {
        echo '<style>
            #my-react-plugin-root {
                margin-top: 2rem;
                min-height: 60px;
            }
        </style>';
    }
}
add_action( 'wp_head', 'litera_embed_mu_styles' );
*/