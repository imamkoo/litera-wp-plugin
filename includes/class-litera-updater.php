<?php
/**
 * Litera Plugin Auto-Updater via GitHub Releases
 *
 * Mengecek versi terbaru dari GitHub Releases secara otomatis.
 * Jika ada versi baru, WordPress akan menampilkan notifikasi update
 * di halaman Plugins, dan admin bisa meng-update dengan satu klik.
 *
 * @package Litera_Plugin
 */

if (!defined('ABSPATH')) exit;

class Litera_GitHub_Updater {

    private $slug;
    private $plugin_data;
    private $github_owner;
    private $github_repo;
    private $plugin_file;
    private $github_response;
    private $access_token;

    /**
     * Constructor
     *
     * @param string $plugin_file  Full path ke file plugin utama (litera.php)
     * @param string $github_owner Username/org GitHub
     * @param string $github_repo  Nama repository GitHub
     * @param string $access_token (Opsional) GitHub Personal Access Token untuk repo private
     */
    public function __construct($plugin_file, $github_owner, $github_repo, $access_token = '') {
        $this->plugin_file  = $plugin_file;
        $this->github_owner = $github_owner;
        $this->github_repo  = $github_repo;
        $this->access_token = $access_token;

        $this->slug = plugin_basename($this->plugin_file);

        add_filter('pre_set_site_transient_update_plugins', [$this, 'check_update']);
        add_filter('plugins_api', [$this, 'plugin_info'], 20, 3);
        add_filter('upgrader_post_install', [$this, 'after_install'], 10, 3);
    }

    /**
     * Ambil data plugin dari header file
     */
    private function get_plugin_data() {
        if (!function_exists('get_plugin_data')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        $this->plugin_data = get_plugin_data($this->plugin_file);
    }

    /**
     * Fetch release terbaru dari GitHub API
     */
    private function get_github_release() {
        if (!empty($this->github_response)) {
            return;
        }

        $url = "https://api.github.com/repos/{$this->github_owner}/{$this->github_repo}/releases/latest";

        $args = [
            'headers' => [
                'Accept' => 'application/vnd.github.v3+json',
                'User-Agent' => 'Litera-WP-Plugin-Updater',
            ],
            'timeout' => 10,
        ];

        if (!empty($this->access_token)) {
            $args['headers']['Authorization'] = "token {$this->access_token}";
        }

        $response = wp_remote_get($url, $args);

        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
            return;
        }

        $this->github_response = json_decode(wp_remote_retrieve_body($response));
    }

    /**
     * Cek apakah ada update tersedia
     */
    public function check_update($transient) {
        if (empty($transient->checked)) {
            return $transient;
        }

        $this->get_plugin_data();
        $this->get_github_release();

        if (empty($this->github_response)) {
            return $transient;
        }

        // Versi dari GitHub (hapus prefix "v" jika ada)
        $github_version = ltrim($this->github_response->tag_name, 'v');
        $current_version = $this->plugin_data['Version'];

        if (version_compare($github_version, $current_version, '>')) {
            // Cari file .zip di assets release
            $download_url = '';
            if (!empty($this->github_response->assets)) {
                foreach ($this->github_response->assets as $asset) {
                    if (substr($asset->name, -4) === '.zip') {
                        $download_url = $asset->browser_download_url;
                        break;
                    }
                }
            }

            // Fallback ke zipball jika tidak ada asset .zip
            if (empty($download_url)) {
                $download_url = $this->github_response->zipball_url;
            }

            $transient->response[$this->slug] = (object) [
                'slug'        => dirname($this->slug),
                'new_version' => $github_version,
                'url'         => $this->github_response->html_url,
                'package'     => $download_url,
                'plugin'      => $this->slug,
            ];
        }

        return $transient;
    }

    /**
     * Tampilkan info plugin di modal "View Details"
     */
    public function plugin_info($result, $action, $args) {
        if ($action !== 'plugin_information') {
            return $result;
        }

        if (!isset($args->slug) || $args->slug !== dirname($this->slug)) {
            return $result;
        }

        $this->get_plugin_data();
        $this->get_github_release();

        if (empty($this->github_response)) {
            return $result;
        }

        $github_version = ltrim($this->github_response->tag_name, 'v');

        $info = (object) [
            'name'          => $this->plugin_data['Name'],
            'slug'          => dirname($this->slug),
            'version'       => $github_version,
            'author'        => $this->plugin_data['Author'],
            'homepage'      => $this->plugin_data['PluginURI'],
            'requires'      => '5.6',
            'tested'        => '6.7',
            'requires_php'  => '7.4',
            'downloaded'    => 0,
            'last_updated'  => $this->github_response->published_at,
            'sections'      => [
                'description' => $this->plugin_data['Description'],
                'changelog'   => nl2br($this->github_response->body ?? 'Lihat changelog di GitHub.'),
            ],
            'download_link' => '',
        ];

        // Set download link
        if (!empty($this->github_response->assets)) {
            foreach ($this->github_response->assets as $asset) {
                if (substr($asset->name, -4) === '.zip') {
                    $info->download_link = $asset->browser_download_url;
                    break;
                }
            }
        }
        if (empty($info->download_link)) {
            $info->download_link = $this->github_response->zipball_url;
        }

        return $info;
    }

    /**
     * Setelah install, pastikan folder plugin namanya benar
     */
    public function after_install($response, $hook_extra, $result) {
        global $wp_filesystem;

        // Hanya proses jika ini plugin kita
        if (!isset($hook_extra['plugin']) || $hook_extra['plugin'] !== $this->slug) {
            return $result;
        }

        $install_directory = plugin_dir_path($this->plugin_file);
        $wp_filesystem->move($result['destination'], $install_directory);
        $result['destination'] = $install_directory;

        // Re-activate plugin setelah update
        activate_plugin($this->slug);

        return $result;
    }
}
