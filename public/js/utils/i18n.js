/**
 * TorrentManager — Internationalization (i18n) Module
 * English as default ('en'), with full support for Portuguese ('pt-BR').
 */

export const STORAGE_LANG_KEY = 'torrentmanager_lang';

export const translations = {
  en: {
    // Document
    page_title: 'TorrentManager — BitTorrent Manager',
    app_tagline: 'Single Executable • Modular BitTorrent Architecture',

    // Header & Status
    status_started: 'Application started',
    status_connected: 'Connected',
    status_connected_ver: 'Connected ({version})',
    status_disconnected: 'Disconnected',
    status_api_offline: 'API Inaccessible',
    server_error: 'Server Error',
    backend_offline_msg: 'Could not reach local backend: {err}',
    settings: 'Settings',
    btn_config_title: 'Open application and BitTorrent client settings',
    lang_btn_title: 'Change language',
    lang_en: 'English (Default)',
    lang_pt_br: 'Português (Brasil)',
    footer_text: 'TorrentManager • Unified High-Performance Architecture • TypeScript',

    // Settings Modal
    modal_config_title: 'Settings',
    modal_config_subtitle: 'Settings permanently persisted in <code>data/config.json</code>',
    modal_close: 'Close',
    label_host: 'qBittorrent Address (Host / IP):',
    placeholder_host: 'localhost or 127.0.0.1',
    label_port: 'Port:',
    label_username: 'Username:',
    label_password: 'Password:',
    placeholder_password_saved: '•••••••• (saved password)',
    placeholder_password_empty: 'Enter password',
    label_refresh_interval: 'Auto-Refresh Interval:',
    opt_refresh_disabled: 'Disabled (Manual refresh only)',
    opt_refresh_5s: 'Every 5 seconds (Very fast)',
    opt_refresh_10s: 'Every 10 seconds (Recommended)',
    opt_refresh_30s: 'Every 30 seconds',
    opt_refresh_60s: 'Every 1 minute (Economic)',
    label_timeout: 'Timeout (ms):',
    label_https: 'Secure connection with HTTPS (SSL/TLS)',
    label_interface_language: 'Interface Language:',
    btn_restore_defaults: 'Restore Defaults',
    btn_test_connection: 'Test Connection',
    btn_testing: 'Testing...',
    btn_save_config: 'Save Settings',
    btn_saving: 'Saving...',

    // Confirmation Modal (Deletion)
    modal_delete_title: 'Delete Files from File System?',
    modal_delete_subtitle_marked: 'You marked',
    modal_delete_subtitle_files: 'file(s) as',
    badge_skip: 'Do Not Download (Disabled)',
    modal_delete_body: 'Do you also want to permanently delete from disk the disabled files that were already partially or fully downloaded?',
    confirm_danger_title: 'Yes, Delete from Disk:',
    confirm_danger_desc: 'Sets priority to "Do Not Download" and removes physical files from computer, freeing up disk space.',
    confirm_safe_title: 'No, Only Disable:',
    confirm_safe_desc: 'Sets priority to "Do Not Download" in BitTorrent client, but preserves existing physical files on computer.',
    btn_cancel: 'Cancel',
    btn_only_disable: 'No, Only Disable',
    btn_delete_from_disk: 'Yes, Delete from Disk',

    // Quick Stats & Filters
    section_torrents_title: 'Torrent Manager',
    section_torrents_subtitle: 'Click on a torrent to load, filter, and select files',
    btn_refresh_torrents: 'Refresh Torrents',
    btn_refreshing: 'Refreshing...',
    btn_refresh_torrents_title: 'Manual list refresh',
    stat_total_torrents: 'Total Torrents',
    stat_total_torrents_title: 'Show all torrents',
    stat_completed: 'Completed / Seeding',
    stat_completed_title: 'Filter by Completed / Upload (Seed)',
    stat_downloading: 'Downloading',
    stat_downloading_title: 'Filter by Downloading',
    stat_paused: 'Paused',
    stat_paused_title: 'Filter by Paused',
    stat_total_size: 'Total Size',
    stat_total_size_title: 'Total size (Click to reset filter to All)',

    // Torrents Search & Actions
    search_torrents_placeholder: 'Search torrents by name, category, or hash...',
    btn_clear_search_title: 'Clear search',
    btn_group_category: 'Group by Category',
    btn_group_category_active: '✓ Grouped by Category',
    btn_group_category_title: 'Display list split into header blocks by category',
    btn_consolidate_category: 'Merge as 1 Torrent',
    btn_consolidate_category_active: '✓ Categories as 1 Torrent',
    btn_consolidate_category_title: 'Consolidate all torrents in each category into 1 virtual torrent with unified files',
    label_categories: 'Categories:',
    cat_all: 'All',
    cat_uncategorized: 'Uncategorized',
    showing_all_torrents: 'Showing all {count} torrents',
    showing_all_torrents_singular: '1 torrent loaded',
    showing_filtered_torrents: 'Showing {count} of {total} torrents',
    table_count_torrents: '{count} torrents loaded from {client}',
    table_count_torrents_singular: '1 torrent loaded from {client}',
    table_count_filtered: 'Showing {count} of {total} filtered torrents',
    table_count_loading: 'Loading torrents list...',
    last_sync: 'Last sync: {time}',

    // Torrents Table Headers
    th_selection: 'Selection',
    th_name: 'Name',
    th_name_title: 'Click to sort by Name',
    th_category: 'Category',
    th_category_title: 'Click to sort by Category',
    th_status: 'Status',
    th_status_title: 'Click to sort by Status',
    th_progress: 'Progress',
    th_progress_title: 'Click to sort by Progress',
    th_size: 'Size',
    th_size_title: 'Click to sort by Size',
    th_speeds: 'Speed',
    th_speeds_title: 'Click to sort by Speed',

    // Torrents Empty States & Rows
    empty_torrents_loading_title: 'Loading torrents...',
    empty_torrents_loading_desc: 'Querying BitTorrent client abstraction layer...',
    empty_torrents_none_title: 'No torrents found',
    empty_torrents_none_desc: 'No active torrents in client or connection awaiting authentication.',
    empty_torrents_filter_title: 'No torrents match the filters',
    empty_torrents_filter_desc: 'Try changing category, selected status, or adjusting search term.',
    empty_torrents_failed_title: 'Failed to load torrents',
    empty_torrents_network_title: 'Network error',
    btn_select_torrent: 'View Files',
    btn_view_n_torrents: 'View {count} Torrents',
    btn_torrent_selected: '✓ Selected',
    virtual_category_sub: '{count} consolidated torrents • Click to view all files',
    progress_completed: 'Completed',
    category_group_count: '{count} torrent{plural}',

    // Torrent Files Section
    badge_torrent_files: 'Torrent Files',
    badge_files_selected: '{count} selected',
    files_meta_normal: '{count} files • {size} total',
    files_meta_virtual: '{count} consolidated files from {torrents} torrents • {size} total',
    files_virtual_hash: 'Unified Category • {count} torrents',
    btn_reload_files: 'Refresh Torrent',
    btn_reload_files_title: 'Reload file status and priorities directly from qBittorrent',
    btn_apply_priorities: 'Apply Priorities',
    btn_apply_priorities_title: 'Send and apply configured priorities to qBittorrent',
    btn_close_files: 'Close Files',
    btn_close_files_title: 'Close files view',
    search_files_placeholder: 'Search terms in name or path (e.g. gran turismo usa)...',
    btn_select_all: 'Select All',
    btn_select_all_title: 'Select all visible files',
    btn_deselect_all: 'Deselect All',
    btn_deselect_all_title: 'Deselect all visible files',
    btn_invert_selection: 'Invert Selection',
    btn_invert_selection_title: 'Invert selection of visible files',
    label_file_status: 'Status:',
    file_filter_all: 'All',
    file_filter_all_title: 'Show all torrent files',
    file_filter_active: 'Active',
    file_filter_active_title: 'Show only active download files (Normal, High, or Maximum priority)',
    file_filter_inactive: 'Inactive',
    file_filter_inactive_title: 'Show only inactive / ignored files (Do Not Download / Priority 0)',
    badge_instant_filter: 'Instant filtering active',
    files_count_loading: 'Loading torrent files...',
    files_count_loaded: '{count} files loaded',
    files_count_query: 'Showing {count} files for "{query}"',
    files_count_filtered: 'Showing {count} of {total} filtered files',
    files_badge_available: '{count} files available',
    files_badge_ratio: '{count} of {total} files',
    files_badge_ratio_filtered: '{count} of {total} filtered files',
    selection_summary: '{selected} of {total} selected',

    // Files Table Headers
    th_file_check: 'Select',
    th_file_check_title: 'Click to sort by selected/deselected',
    th_file_index: '#',
    th_file_index_title: 'Click to sort by Index # | Drag to move column',
    th_file_name: 'File Name',
    th_file_name_title: 'Click to sort by Name | Drag to move column',
    th_file_path: 'Path',
    th_file_path_title: 'Click to sort by Path | Drag to move column',
    th_file_size: 'Size',
    th_file_size_title: 'Click to sort by Size | Drag to move column',
    th_file_priority: 'Priority',
    th_file_priority_title: 'Click to sort by Priority | Drag to move column',
    th_file_progress: 'Progress',
    th_file_progress_title: 'Click to sort by Progress | Drag to move column',

    // Files Table Rows & States
    empty_files_loading_title: 'Loading files...',
    empty_files_loading_desc: 'Querying file structure in BitTorrent client...',
    empty_files_none_title: 'No files found',
    empty_files_none_desc: 'No files match the active filters.',
    empty_files_failed_title: 'Failed to load files',
    file_downloaded_title: 'File 100% downloaded • Click to open folder in File Explorer',
    file_progress_title: 'File at {prog}%',
    btn_open_folder_title: 'Open folder in File Explorer',
    checkbox_file_title: 'Select or deselect file',

    // Files Context Menu
    ctx_title: 'Visible Columns',
    ctx_subtitle: 'Toggle with left click',
    ctx_show_all: 'Show All Columns',
    ctx_reset: 'Reset Default Columns',
    ctx_col_check: 'Select',
    ctx_col_index: '# Index',
    ctx_col_name: 'File Name',
    ctx_col_path: 'Full Path',
    ctx_col_size: 'Size',
    ctx_col_priority: 'Current Priority',
    ctx_col_progress: 'Progress',
    ctx_tag_checkbox: 'Checkbox',
    ctx_tag_index: 'Index',
    ctx_tag_text: 'Text',
    ctx_tag_bytes: 'Bytes',
    ctx_tag_status: 'Status',
    ctx_tag_bar: 'Bar',
    ctx_cannot_hide_last: 'Cannot hide the only visible column',
    ctx_toggle_hint: 'Click to toggle visibility',

    // Connection Form Card
    card_connection_title: 'qBittorrent Configuration',
    card_connection_subtitle: 'Configurable via file or interface',
    label_quick_host: 'Address / Host:',
    placeholder_quick_host: 'e.g. localhost or 127.0.0.1',
    label_quick_port: 'Port:',
    label_quick_username: 'Username:',
    label_quick_password: 'Password:',
    label_quick_refresh: 'Auto-Refresh Interval:',
    opt_quick_refresh_0: 'Disabled (Manual only)',
    opt_quick_refresh_5: 'Every 5 seconds',
    opt_quick_refresh_10: 'Every 10 seconds (Recommended)',
    opt_quick_refresh_30: 'Every 30 seconds',
    opt_quick_refresh_60: 'Every 1 minute',
    label_quick_timeout: 'Timeout (ms):',
    label_quick_https: 'Use HTTPS (secure SSL/TLS)',
    label_quick_save: 'Save permanently in <code>data/config.json</code>',
    btn_quick_save: 'Save Configuration',
    btn_quick_connect: 'Connect to qBittorrent',
    btn_quick_reconnect: 'Reconnect',
    btn_quick_authenticating: 'Authenticating...',

    // Diagnostics Card
    card_diag_title: 'Status and Diagnostics',
    card_diag_subtitle: 'Web API Monitoring',
    diag_banner_client_status: 'Client Status',
    diag_banner_waiting: 'Waiting for connection command to qBittorrent...',
    diag_banner_ready_title: 'Ready to connect',
    diag_banner_ready_detail: 'Credentials ready. Click "Connect to qBittorrent" to start session.',
    diag_banner_connected_title: 'Connected to {client}',
    diag_banner_connected_detail: 'Authentication and SID session successfully validated.',
    diag_banner_error_title: 'Connection Failure',
    diag_endpoint: 'Endpoint URL:',
    diag_app_version: 'qBittorrent Version:',
    diag_webapi_version: 'Web API Version:',
    diag_refresh_status: 'Auto-refresh Torrents:',
    diag_refresh_every: 'Every {s}s',
    diag_refresh_off: 'Disabled',
    diag_cookie: 'Cookie Session (SID):',
    diag_cookie_active: 'Active (Validated SID{lat})',
    diag_cookie_inactive: 'Inactive',
    btn_recheck: 'Re-check Connection',
    btn_disconnect: 'Disconnect',

    // Status Labels
    status_downloading: 'Downloading',
    status_forcedDL: 'Downloading (Forced)',
    status_stalledDL: 'Downloading (Stalled)',
    status_metaDL: 'Downloading Metadata',
    status_forcedMetaDL: 'Downloading Metadata',
    status_uploading: 'Seeding',
    status_forcedUP: 'Seeding (Forced)',
    status_stalledUP: 'Seeding (No Connection)',
    status_pausedDL: 'Paused',
    status_stoppedDL: 'Stopped',
    status_pausedUP: 'Completed (Paused)',
    status_stoppedUP: 'Completed (Paused)',
    status_queuedDL: 'Queued (Download)',
    status_queuedUP: 'Queued (Upload)',
    status_queuedForChecking: 'Queued (Checking)',
    status_checkingDL: 'Checking',
    status_checkingUP: 'Checking',
    status_checkingResumeData: 'Checking',
    status_checking: 'Checking',
    status_allocating: 'Allocating Space',
    status_moving: 'Moving Files',
    status_error: 'Error',
    status_missingFiles: 'Missing Files',
    status_completed: 'Completed',
    status_paused: 'Paused',
    status_queued: 'Queued',
    status_unknown: 'Unknown',

    // Priorities
    prio_skip: 'Do not download / Ignored',
    prio_normal: 'Normal',
    prio_high: 'High',
    prio_maximal: 'Maximum',
    prio_custom: 'Priority {prio}',

    // Toasts & Notifications
    toast_status_filter_title: 'Status Filter',
    toast_status_filter_msg: 'Active filter: {label}',
    filter_label_all: 'All Torrents',
    filter_label_completed: 'Completed / Seeding',
    filter_label_downloading: 'Downloading',
    filter_label_paused: 'Paused',
    toast_cat_filter_title: 'Category Filter',
    toast_cat_filter_msg: 'Showing category: {label}',
    label_all_categories: 'All Categories',
    toast_view_title: 'Torrent View',
    toast_grouped_msg: 'Torrents grouped by category.',
    toast_linear_msg: 'Linear view of torrents list.',
    toast_consolidated_title: 'Unified Category Mode',
    toast_consolidated_msg_on: 'Torrents of each category consolidated as 1 unified virtual torrent.',
    toast_consolidated_msg_off: 'Normal view of individual torrents.',
    toast_sort_title: 'Torrent Sorting',
    toast_sort_msg: 'Torrents sorted by {col} ({dir}).',
    sort_dir_asc: 'ascending',
    sort_dir_desc: 'descending',
    sort_col_name: 'Name',
    sort_col_category: 'Category',
    sort_col_status: 'Status',
    sort_col_progress: 'Progress',
    sort_col_size: 'Size',
    sort_col_speeds: 'Speed',
    toast_torrents_updated_title: 'Torrents Updated',
    toast_torrents_updated_msg: '{count} torrents synchronized successfully!',
    toast_update_error_title: 'Update Error',
    toast_update_error_msg: 'Could not load torrents list.',
    toast_network_error_title: 'Network Error',
    toast_col_adjusted_title: 'Column Adjusted',
    toast_col_adjusted_msg: 'Default width restored for "{col}".',
    toast_order_title: 'Order Updated',
    toast_order_msg: 'Column position reorganized successfully!',
    toast_col_updated_title: 'Column Updated',
    toast_col_updated_msg: 'Column "{col}" was {action}.',
    col_action_shown: 'shown',
    col_action_hidden: 'hidden',
    toast_cols_restored_title: 'Columns Restored',
    toast_cols_restored_msg: 'All 7 columns are visible.',
    toast_pattern_restored_title: 'Defaults Restored',
    toast_pattern_restored_msg: 'Column order, widths, and visibility have been reset.',
    toast_warn_title: 'Warning',
    toast_warn_min_col: 'At least one column must remain visible in the table.',
    toast_category_loaded_title: 'Consolidated Category',
    toast_category_loaded_msg: '{files} files from {torrents} torrents loaded as 1 unified torrent!',
    toast_files_loaded_title: 'Files Loaded',
    toast_files_loaded_msg: '{count} files loaded successfully (Virtualization Active).',
    toast_files_error_title: 'Error',
    toast_files_error_msg: 'Failed to load torrent files.',
    toast_bulk_title: 'Bulk Selection',
    toast_bulk_selected_visible: '{count} visible files were selected.',
    toast_bulk_selected_all: 'All {count} files were selected.',
    toast_bulk_deselected_visible: '{count} visible files were deselected.',
    toast_bulk_deselected_all: 'All {count} files were deselected.',
    toast_bulk_invert_title: 'Inverted Selection',
    toast_bulk_invert_visible: 'Selection inverted for {count} visible files.',
    toast_bulk_invert_all: 'Selection inverted for all {count} files.',
    toast_no_files_apply: 'No torrent or files selected to apply priorities.',
    btn_syncing_deleting: 'Deleting files and syncing...',
    btn_syncing_sending: 'Sending to qBittorrent...',
    toast_prio_applied_title: 'Priorities Applied!',
    toast_prio_applied_msg: '{marked} files marked as Normal (1) and {unmarked} as Do Not Download (0).',
    toast_prio_disk_title: 'Priorities and Disk Updated!',
    toast_prio_disk_msg: '{marked} files marked (Normal), {unmarked} disabled and {deleted} file(s) deleted from disk ({space} freed).',
    feedback_prio_disk_title: 'Priorities and Disk Updated',
    feedback_prio_disk_detail: 'Priorities were synchronized with qBittorrent and {deleted} disabled file(s) were deleted from local disk ({space} freed).',
    feedback_prio_title: 'Priorities Updated in qBittorrent',
    feedback_prio_detail: 'Priorities for torrent "{name}" were successfully synchronized with the BitTorrent client.',
    toast_cat_prio_applied_title: 'Category Priorities Applied!',
    toast_cat_prio_applied_msg: 'Priorities synchronized for all {count} torrents in category! ({marked} selected, {unmarked} disabled).',
    toast_cat_prio_deleted_msg: ' {count} file(s) deleted ({space} freed).',
    toast_cat_prio_partial: 'Some torrents in the category may not have updated all priorities.',
    toast_warn_no_torrent_refresh: 'No torrent selected to update.',
    feedback_cat_synced_title: 'Consolidated Category Synchronized',
    toast_apply_error_title: 'Failed to Apply',
    toast_not_downloaded_title: 'File Not Downloaded',
    toast_not_downloaded_msg: 'File "{name}" is at {prog} and is not fully downloaded yet.',
    toast_opening_folder_title: 'Opening Folder...',
    toast_opening_folder_msg: 'Opening location of "{name}" in File Explorer...',
    toast_folder_opened_title: 'Folder Opened',
    toast_folder_opened_msg: 'Folder for "{name}" was successfully opened in File Explorer!',
    toast_folder_error_title: 'Error Opening',
    toast_folder_error_msg: 'Could not open file folder.',
    toast_torrent_refreshed_title: 'Torrent Updated',
    toast_torrent_refreshed_msg: 'File status and priorities refreshed from qBittorrent.',
    toast_defaults_loaded_title: 'Defaults Loaded',
    toast_defaults_loaded_msg: 'qBittorrent default values filled into fields.',
    toast_test_success_title: 'Test Successful',
    toast_test_success_msg: 'Successfully connected to qBittorrent!',
    toast_test_failed_title: 'Test Failed',
    toast_test_failed_msg: 'Could not authenticate with qBittorrent.',
    toast_config_saved_title: 'Settings Saved',
    toast_config_saved_msg: 'Settings persisted in data/config.json successfully!',
    toast_save_error_title: 'Error Saving',
    toast_save_error_msg: 'Failed to save configuration.',
    toast_connected_title: 'Connection Established',
    toast_disconnected_title: 'Disconnected',
    toast_disconnected_msg: 'Session terminated with client.',
    diag_disconnected_user: 'Disconnected by user',
    toast_lang_changed_title: 'Language Changed',
    toast_lang_changed_msg: 'Interface language set to English.',
  },

  'pt-BR': {
    // Documento
    page_title: 'TorrentManager — Gerenciador de BitTorrent',
    app_tagline: 'Single Executable • Modular BitTorrent Architecture',

    // Barra Superior & Status
    status_started: 'Aplicação iniciada',
    status_connected: 'Conectado',
    status_connected_ver: 'Conectado ({version})',
    status_disconnected: 'Desconectado',
    status_api_offline: 'API Inacessível',
    server_error: 'Erro de Servidor',
    backend_offline_msg: 'Não foi possível contatar o backend local: {err}',
    settings: 'Configurações',
    btn_config_title: 'Abrir tela de configurações da aplicação e do cliente BitTorrent',
    lang_btn_title: 'Mudar idioma',
    lang_en: 'English (Default)',
    lang_pt_br: 'Português (Brasil)',
    footer_text: 'TorrentManager • Arquitetura Unificada de Alto Desempenho • TypeScript',

    // Modal de Configurações
    modal_config_title: 'Tela de Configurações',
    modal_config_subtitle: 'Configurações persistidas permanentemente em <code>data/config.json</code>',
    modal_close: 'Fechar',
    label_host: 'Endereço do qBittorrent (Host / IP):',
    placeholder_host: 'localhost ou 127.0.0.1',
    label_port: 'Porta:',
    label_username: 'Usuário:',
    label_password: 'Senha:',
    placeholder_password_saved: '•••••••• (senha salva)',
    placeholder_password_empty: 'Digite a senha',
    label_refresh_interval: 'Intervalo de Atualização Automática:',
    opt_refresh_disabled: 'Desativado (Atualização apenas manual)',
    opt_refresh_5s: 'A cada 5 segundos (Muito rápido)',
    opt_refresh_10s: 'A cada 10 segundos (Recomendado)',
    opt_refresh_30s: 'A cada 30 segundos',
    opt_refresh_60s: 'A cada 1 minuto (Econômico)',
    label_timeout: 'Timeout (ms):',
    label_https: 'Conexão Segura com HTTPS (SSL/TLS)',
    label_interface_language: 'Idioma da Interface:',
    btn_restore_defaults: 'Restaurar Padrões',
    btn_test_connection: 'Testar Conexão',
    btn_testing: 'Testando...',
    btn_save_config: 'Salvar Configurações',
    btn_saving: 'Salvando...',

    // Modal de Confirmação (Exclusão)
    modal_delete_title: 'Apagar Arquivos do Sistema de Arquivos?',
    modal_delete_subtitle_marked: 'Você marcou',
    modal_delete_subtitle_files: 'arquivo(s) como',
    badge_skip: 'Não Baixar (Desativados)',
    modal_delete_body: 'Deseja também apagar definitivamente do disco os arquivos desativados que já foram parcial ou totalmente baixados?',
    confirm_danger_title: 'Sim, Apagar do Disco:',
    confirm_danger_desc: 'Define a prioridade como "Não Baixar" e remove os arquivos físicos do computador, liberando espaço em disco.',
    confirm_safe_title: 'Não, Apenas Desativar:',
    confirm_safe_desc: 'Define a prioridade como "Não Baixar" no cliente BitTorrent, mas preserva os arquivos físicos já existentes no computador.',
    btn_cancel: 'Cancelar',
    btn_only_disable: 'Não, Apenas Desativar',
    btn_delete_from_disk: 'Sim, Apagar do Disco',

    // Estatísticas Rápidas & Filtros
    section_torrents_title: 'Gerenciador de Torrents',
    section_torrents_subtitle: 'Clique em um torrent para carregar, filtrar e selecionar arquivos',
    btn_refresh_torrents: 'Atualizar Torrents',
    btn_refreshing: 'Atualizando...',
    btn_refresh_torrents_title: 'Atualização manual da lista',
    stat_total_torrents: 'Total de Torrents',
    stat_total_torrents_title: 'Exibir todos os torrents',
    stat_completed: 'Concluídos / Upload',
    stat_completed_title: 'Filtrar por Concluídos / Upload (Seed)',
    stat_downloading: 'Em Download',
    stat_downloading_title: 'Filtrar por Em Download',
    stat_paused: 'Pausados',
    stat_paused_title: 'Filtrar por Pausados',
    stat_total_size: 'Tamanho Total',
    stat_total_size_title: 'Tamanho total (Clique para redefinir filtro para Todos)',

    // Busca & Ações de Torrents
    search_torrents_placeholder: 'Pesquisar torrents por nome, categoria ou hash...',
    btn_clear_search_title: 'Limpar pesquisa',
    btn_group_category: 'Agrupar por Categoria',
    btn_group_category_active: '✓ Agrupado por Categoria',
    btn_group_category_title: 'Exibir a lista dividida em blocos de cabeçalho por categoria',
    btn_consolidate_category: 'Fundir como 1 Torrent',
    btn_consolidate_category_active: '✓ Categorias como 1 Torrent',
    btn_consolidate_category_title: 'Consolidar todos os torrents de cada categoria em 1 único torrent virtual com arquivos unificados',
    label_categories: 'Categorias:',
    cat_all: 'Todos',
    cat_uncategorized: 'Sem Categoria',
    showing_all_torrents: 'Exibindo todos os {count} torrents',
    showing_all_torrents_singular: '1 torrent carregado',
    showing_filtered_torrents: 'Exibindo {count} de {total} torrents',
    table_count_torrents: '{count} torrents carregados do {client}',
    table_count_torrents_singular: '1 torrent carregado',
    table_count_filtered: 'Exibindo {count} de {total} torrents filtrados',
    table_count_loading: 'Carregando lista de torrents...',
    last_sync: 'Última sincronização: {time}',

    // Cabeçalhos da Tabela de Torrents
    th_selection: 'Seleção',
    th_name: 'Nome',
    th_name_title: 'Clique para ordenar por Nome',
    th_category: 'Categoria',
    th_category_title: 'Clique para ordenar por Categoria',
    th_status: 'Status',
    th_status_title: 'Clique para ordenar por Status',
    th_progress: 'Progresso',
    th_progress_title: 'Clique para ordenar por Progresso',
    th_size: 'Tamanho',
    th_size_title: 'Clique para ordenar por Tamanho',
    th_speeds: 'Velocidade',
    th_speeds_title: 'Clique para ordenar por Velocidade',

    // Estados Vazios & Linhas de Torrents
    empty_torrents_loading_title: 'Carregando torrents...',
    empty_torrents_loading_desc: 'Consultando a camada de abstração do cliente BitTorrent...',
    empty_torrents_none_title: 'Nenhum torrent encontrado',
    empty_torrents_none_desc: 'Não há torrents ativos no cliente ou a conexão aguarda autenticação.',
    empty_torrents_filter_title: 'Nenhum torrent corresponde aos filtros',
    empty_torrents_filter_desc: 'Tente alterar a categoria, o status selecionado ou ajustar o termo de pesquisa.',
    empty_torrents_failed_title: 'Falha ao carregar torrents',
    empty_torrents_network_title: 'Erro de rede',
    btn_select_torrent: 'Ver Arquivos',
    btn_view_n_torrents: 'Ver {count} Torrents',
    btn_torrent_selected: '✓ Selecionado',
    virtual_category_sub: '{count} torrents consolidados • Clique para ver todos os arquivos',
    progress_completed: 'Concluído',
    category_group_count: '{count} torrent{plural}',

    // Seção de Arquivos do Torrent
    badge_torrent_files: 'Arquivos do Torrent',
    badge_files_selected: '{count} marcados',
    files_meta_normal: '{count} arquivos • {size} no total',
    files_meta_virtual: '{count} arquivos consolidados de {torrents} torrents • {size} no total',
    files_virtual_hash: 'Categoria Unificada • {count} torrents',
    btn_reload_files: 'Atualizar Torrent',
    btn_reload_files_title: 'Recarregar estado e prioridades dos arquivos direto do qBittorrent',
    btn_apply_priorities: 'Aplicar Prioridades',
    btn_apply_priorities_title: 'Enviar e aplicar as prioridades configuradas ao qBittorrent',
    btn_close_files: 'Fechar Arquivos',
    btn_close_files_title: 'Fechar visualização de arquivos',
    search_files_placeholder: 'Pesquisar termos no nome ou caminho (ex: gran turismo usa)...',
    btn_select_all: 'Marcar Todos',
    btn_select_all_title: 'Marcar todos os arquivos visíveis',
    btn_deselect_all: 'Desmarcar Todos',
    btn_deselect_all_title: 'Desmarcar todos os arquivos visíveis',
    btn_invert_selection: 'Inverter Seleção',
    btn_invert_selection_title: 'Inverter seleção dos arquivos visíveis',
    label_file_status: 'Status:',
    file_filter_all: 'Todos',
    file_filter_all_title: 'Exibir todos os arquivos do torrent',
    file_filter_active: 'Ativos',
    file_filter_active_title: 'Exibir apenas arquivos ativos para download (Prioridade Normal, Alta ou Máxima)',
    file_filter_inactive: 'Inativos',
    file_filter_inactive_title: 'Exibir apenas arquivos inativos / ignorados (Não Baixar / Prioridade 0)',
    badge_instant_filter: 'Filtragem instantânea ativa',
    files_count_loading: 'Carregando arquivos do torrent...',
    files_count_loaded: '{count} arquivos carregados',
    files_count_query: 'Exibindo {count} arquivos para "{query}"',
    files_count_filtered: 'Exibindo {count} de {total} arquivos filtrados',
    files_badge_available: '{count} arquivos disponíveis',
    files_badge_ratio: '{count} de {total} arquivos',
    files_badge_ratio_filtered: '{count} de {total} arquivos filtrados',
    selection_summary: '{selected} de {total} selecionados',

    // Cabeçalhos da Tabela de Arquivos
    th_file_check: 'Marcar',
    th_file_check_title: 'Clique para ordenar por marcados/desmarcados',
    th_file_index: '#',
    th_file_index_title: 'Clique para ordenar pelo Índice # | Arraste para mover coluna',
    th_file_name: 'Nome do Arquivo',
    th_file_name_title: 'Clique para ordenar por Nome | Arraste para mover coluna',
    th_file_path: 'Caminho',
    th_file_path_title: 'Clique para ordenar por Caminho | Arraste para mover coluna',
    th_file_size: 'Tamanho',
    th_file_size_title: 'Clique para ordenar por Tamanho | Arraste para mover coluna',
    th_file_priority: 'Prioridade',
    th_file_priority_title: 'Clique para ordenar por Prioridade | Arraste para mover coluna',
    th_file_progress: 'Progresso',
    th_file_progress_title: 'Clique para ordenar por Progresso | Arraste para mover coluna',

    // Estados e Linhas da Tabela de Arquivos
    empty_files_loading_title: 'Carregando arquivos...',
    empty_files_loading_desc: 'Consultando a estrutura de arquivos no cliente BitTorrent...',
    empty_files_none_title: 'Nenhum arquivo encontrado',
    empty_files_none_desc: 'Nenhum arquivo corresponde aos filtros ativos.',
    empty_files_failed_title: 'Falha ao carregar arquivos',
    file_downloaded_title: 'Arquivo 100% baixado • Clique para abrir a pasta no Explorador de Arquivos',
    file_progress_title: 'Arquivo em {prog}%',
    btn_open_folder_title: 'Abrir pasta no Explorador de Arquivos',
    checkbox_file_title: 'Marcar ou desmarcar arquivo',

    // Menu de Contexto
    ctx_title: 'Colunas Visíveis',
    ctx_subtitle: 'Alternar com botão esquerdo',
    ctx_show_all: 'Exibir Todas as Colunas',
    ctx_reset: 'Restaurar Padrão de Colunas',
    ctx_col_check: 'Marcar',
    ctx_col_index: '# Índice',
    ctx_col_name: 'Nome do Arquivo',
    ctx_col_path: 'Caminho Completo',
    ctx_col_size: 'Tamanho',
    ctx_col_priority: 'Prioridade Atual',
    ctx_col_progress: 'Progresso',
    ctx_tag_checkbox: 'Checkbox',
    ctx_tag_index: 'Índice',
    ctx_tag_text: 'Texto',
    ctx_tag_bytes: 'Bytes',
    ctx_tag_status: 'Status',
    ctx_tag_bar: 'Barra',
    ctx_cannot_hide_last: 'Não é possível ocultar a única coluna visível',
    ctx_toggle_hint: 'Clique para alternar visibilidade',

    // Card de Conexão Rápida
    card_connection_title: 'Configuração do qBittorrent',
    card_connection_subtitle: 'Configurável por arquivo ou interface',
    label_quick_host: 'Endereço / Host:',
    placeholder_quick_host: 'ex: localhost ou 127.0.0.1',
    label_quick_port: 'Porta:',
    label_quick_username: 'Usuário:',
    label_quick_password: 'Senha:',
    label_quick_refresh: 'Intervalo de Atualização Automática:',
    opt_quick_refresh_0: 'Desativado (Manual apenas)',
    opt_quick_refresh_5: 'A cada 5 segundos',
    opt_quick_refresh_10: 'A cada 10 segundos (Recomendado)',
    opt_quick_refresh_30: 'A cada 30 segundos',
    opt_quick_refresh_60: 'A cada 1 minuto',
    label_quick_timeout: 'Timeout (ms):',
    label_quick_https: 'Usar HTTPS (SSL/TLS seguro)',
    label_quick_save: 'Salvar permanentemente em <code>data/config.json</code>',
    btn_quick_save: 'Salvar Configuração',
    btn_quick_connect: 'Conectar ao qBittorrent',
    btn_quick_reconnect: 'Reconectar',
    btn_quick_authenticating: 'Autenticando...',

    // Card de Diagnóstico
    card_diag_title: 'Status e Diagnóstico',
    card_diag_subtitle: 'Monitoramento da Web API',
    diag_banner_client_status: 'Status do Cliente',
    diag_banner_waiting: 'Aguardando comando de conexão com o qBittorrent...',
    diag_banner_ready_title: 'Pronto para conexão',
    diag_banner_ready_detail: 'Credenciais prontas. Clique em "Conectar ao qBittorrent" para iniciar a sessão.',
    diag_banner_connected_title: 'Conectado ao {client}',
    diag_banner_connected_detail: 'Autenticação e sessão SID validadas com sucesso.',
    diag_banner_error_title: 'Falha na Conexão',
    diag_endpoint: 'URL do Endpoint:',
    diag_app_version: 'Versão do qBittorrent:',
    diag_webapi_version: 'Versão da Web API:',
    diag_refresh_status: 'Auto-refresh Torrents:',
    diag_refresh_every: 'A cada {s}s',
    diag_refresh_off: 'Desativado',
    diag_cookie: 'Sessão Cookie (SID):',
    diag_cookie_active: 'Ativo (SID Validado{lat})',
    diag_cookie_inactive: 'Inativo',
    btn_recheck: 'Reverificar Conexão',
    btn_disconnect: 'Desconectar',

    // Rótulos de Status
    status_downloading: 'Baixando',
    status_forcedDL: 'Baixando (Forçado)',
    status_stalledDL: 'Baixando (Pendente)',
    status_metaDL: 'Baixando Metadados',
    status_forcedMetaDL: 'Baixando Metadados',
    status_uploading: 'Enviando (Seed)',
    status_forcedUP: 'Enviando (Forçado)',
    status_stalledUP: 'Enviando (Sem Conexão)',
    status_pausedDL: 'Pausado',
    status_stoppedDL: 'Parado',
    status_pausedUP: 'Concluído (Pausado)',
    status_stoppedUP: 'Concluído (Pausado)',
    status_queuedDL: 'Em Fila (Download)',
    status_queuedUP: 'Em Fila (Envio)',
    status_queuedForChecking: 'Em Fila (Verificação)',
    status_checkingDL: 'Verificando',
    status_checkingUP: 'Verificando',
    status_checkingResumeData: 'Verificando',
    status_checking: 'Verificando',
    status_allocating: 'Alocando Espaço',
    status_moving: 'Movendo Arquivos',
    status_error: 'Erro',
    status_missingFiles: 'Arquivos Ausentes',
    status_completed: 'Concluído',
    status_paused: 'Pausado',
    status_queued: 'Em Fila',
    status_unknown: 'Desconhecido',

    // Prioridades
    prio_skip: 'Não baixar / Ignorado',
    prio_normal: 'Normal',
    prio_high: 'Alta',
    prio_maximal: 'Máxima',
    prio_custom: 'Prioridade {prio}',

    // Toasts e Notificações
    toast_status_filter_title: 'Filtro de Status',
    toast_status_filter_msg: 'Filtro ativo: {label}',
    filter_label_all: 'Todos os Torrents',
    filter_label_completed: 'Concluídos / Upload',
    filter_label_downloading: 'Em Download',
    filter_label_paused: 'Pausados',
    toast_cat_filter_title: 'Filtro de Categoria',
    toast_cat_filter_msg: 'Exibindo categoria: {label}',
    label_all_categories: 'Todas as Categorias',
    toast_view_title: 'Visualização de Torrents',
    toast_grouped_msg: 'Torrents agrupados por categoria.',
    toast_linear_msg: 'Visualização linear da lista de torrents.',
    toast_consolidated_title: 'Modo Categoria Unificada',
    toast_consolidated_msg_on: 'Torrents de cada categoria consolidados como 1 torrent virtual unificado.',
    toast_consolidated_msg_off: 'Visualização normal de torrents individuais.',
    toast_sort_title: 'Ordenação de Torrents',
    toast_sort_msg: 'Torrents ordenados por {col} ({dir}).',
    sort_dir_asc: 'crescente',
    sort_dir_desc: 'decrescente',
    sort_col_name: 'Nome',
    sort_col_category: 'Categoria',
    sort_col_status: 'Status',
    sort_col_progress: 'Progresso',
    sort_col_size: 'Tamanho',
    sort_col_speeds: 'Velocidade',
    toast_torrents_updated_title: 'Torrents Atualizados',
    toast_torrents_updated_msg: '{count} torrents sincronizados com sucesso!',
    toast_update_error_title: 'Erro ao Atualizar',
    toast_update_error_msg: 'Não foi possível carregar a lista de torrents.',
    toast_network_error_title: 'Erro de Rede',
    toast_col_adjusted_title: 'Coluna Ajustada',
    toast_col_adjusted_msg: 'Largura padrão restaurada para "{col}".',
    toast_order_title: 'Ordem Atualizada',
    toast_order_msg: 'Posição da coluna reorganizada com sucesso!',
    toast_col_updated_title: 'Coluna Atualizada',
    toast_col_updated_msg: 'Coluna "{col}" foi {action}.',
    col_action_shown: 'exibida',
    col_action_hidden: 'ocultada',
    toast_cols_restored_title: 'Colunas Restauradas',
    toast_cols_restored_msg: 'Todas as 7 colunas estão visíveis.',
    toast_pattern_restored_title: 'Padrão Restaurado',
    toast_pattern_restored_msg: 'Ordem, larguras e visibilidade das colunas foram redefinidas.',
    toast_warn_title: 'Aviso',
    toast_warn_min_col: 'Pelo menos uma coluna deve permanecer visível na tabela.',
    toast_category_loaded_title: 'Categoria Consolidada',
    toast_category_loaded_msg: '{files} arquivos de {torrents} torrents carregados como 1 torrent unificado!',
    toast_files_loaded_title: 'Arquivos Carregados',
    toast_files_loaded_msg: '{count} arquivos carregados com sucesso (Virtualização Ativa).',
    toast_files_error_title: 'Erro',
    toast_files_error_msg: 'Falha ao carregar arquivos do torrent.',
    toast_bulk_title: 'Seleção em Massa',
    toast_bulk_selected_visible: '{count} arquivos visíveis foram marcados.',
    toast_bulk_selected_all: 'Todos os {count} arquivos foram marcados.',
    toast_bulk_deselected_visible: '{count} arquivos visíveis foram desmarcados.',
    toast_bulk_deselected_all: 'Todos os {count} arquivos foram desmarcados.',
    toast_bulk_invert_title: 'Seleção Invertida',
    toast_bulk_invert_visible: 'Seleção invertida para {count} arquivos visíveis.',
    toast_bulk_invert_all: 'Seleção invertida para todos os {count} arquivos.',
    toast_no_files_apply: 'Nenhum torrent ou arquivo selecionado para aplicar prioridades.',
    btn_syncing_deleting: 'Excluindo arquivos e sincronizando...',
    btn_syncing_sending: 'Enviando ao qBittorrent...',
    toast_prio_applied_title: 'Prioridades Aplicadas!',
    toast_prio_applied_msg: '{marked} arquivos marcados como Normal (1) e {unmarked} como Não Baixar (0).',
    toast_prio_disk_title: 'Prioridades e Disco Atualizados!',
    toast_prio_disk_msg: '{marked} arquivos marcados (Normal), {unmarked} desativados e {deleted} arquivo(s) apagado(s) do disco ({space} liberados).',
    feedback_prio_disk_title: 'Prioridades e Disco Atualizados',
    feedback_prio_disk_detail: 'As prioridades foram sincronizadas com o qBittorrent e {deleted} arquivo(s) desativado(s) foram apagados do disco local ({space} liberados).',
    feedback_prio_title: 'Prioridades Atualizadas no qBittorrent',
    feedback_prio_detail: 'As prioridades do torrent "{name}" foram sincronizadas com sucesso com o cliente BitTorrent.',
    toast_cat_prio_applied_title: 'Prioridades da Categoria Aplicadas!',
    toast_cat_prio_applied_msg: 'Prioridades sincronizadas para todos os {count} torrents da categoria! ({marked} marcados, {unmarked} desativados).',
    toast_cat_prio_deleted_msg: ' {count} arquivo(s) apagado(s) ({space} liberados).',
    toast_cat_prio_partial: 'Alguns torrents da categoria podem não ter atualizado todas as prioridades.',
    toast_warn_no_torrent_refresh: 'Nenhum torrent selecionado para atualizar.',
    feedback_cat_synced_title: 'Categoria Consolidada Sincronizada',
    toast_apply_error_title: 'Falha ao aplicar prioridades',
    toast_not_downloaded_title: 'Arquivo Não Baixado',
    toast_not_downloaded_msg: 'O arquivo "{name}" está em {prog} e ainda não foi totalmente baixado.',
    toast_opening_folder_title: 'Abrindo Pasta...',
    toast_opening_folder_msg: 'Abrindo localização de "{name}" no Explorador...',
    toast_folder_opened_title: 'Pasta Aberta',
    toast_folder_opened_msg: 'A pasta de "{name}" foi aberta com sucesso no Explorador de Arquivos!',
    toast_folder_error_title: 'Erro ao Abrir',
    toast_folder_error_msg: 'Não foi possível abrir a pasta do arquivo.',
    toast_torrent_refreshed_title: 'Torrent Atualizado',
    toast_torrent_refreshed_msg: 'Estado e prioridades dos arquivos atualizados a partir do qBittorrent.',
    toast_defaults_loaded_title: 'Padrões Carregados',
    toast_defaults_loaded_msg: 'Valores padrão do qBittorrent preenchidos nos campos.',
    toast_test_success_title: 'Teste Bem-sucedido',
    toast_test_success_msg: 'Conectado com sucesso ao qBittorrent!',
    toast_test_failed_title: 'Falha no Teste',
    toast_test_failed_msg: 'Não foi possível autenticar no qBittorrent.',
    toast_config_saved_title: 'Configurações Salvas',
    toast_config_saved_msg: 'Configurações persistidas em data/config.json com sucesso!',
    toast_save_error_title: 'Erro ao Salvar',
    toast_save_error_msg: 'Falha ao salvar configurações.',
    toast_connected_title: 'Conexão Estabelecida',
    toast_disconnected_title: 'Desconectado',
    toast_disconnected_msg: 'Sessão encerrada com o cliente.',
    diag_disconnected_user: 'Desconectado pelo usuário',
    toast_lang_changed_title: 'Idioma Alterado',
    toast_lang_changed_msg: 'Idioma da interface alterado para Português (Brasil).',
  },
};

let currentLanguage = 'en';

/**
 * Gets currently configured language
 */
export function getLanguage() {
  return currentLanguage;
}

/**
 * Formats a number according to current locale
 */
export function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return Number(num).toLocaleString(currentLanguage === 'pt-BR' ? 'pt-BR' : 'en-US');
}

/**
 * Formats a date/time according to current locale
 */
export function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  return d.toLocaleTimeString(currentLanguage === 'pt-BR' ? 'pt-BR' : 'en-US');
}

/**
 * Translates a key to active language with {key} parameter interpolation
 */
export function t(key, params = {}) {
  const dict = translations[currentLanguage] || translations.en;
  let text = dict[key] !== undefined ? dict[key] : (translations.en[key] !== undefined ? translations.en[key] : key);

  if (typeof text !== 'string') return text;

  if (params && typeof params === 'object') {
    Object.keys(params).forEach((paramKey) => {
      const val = params[paramKey] !== undefined && params[paramKey] !== null ? params[paramKey] : '';
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
    });
  }

  return text;
}

/**
 * Applies translations to all static DOM elements
 */
export function applyTranslations() {
  document.documentElement.lang = currentLanguage === 'pt-BR' ? 'pt-BR' : 'en';

  // Update tab title
  document.title = t('page_title');

  // Elements with data-i18n (plain text / html)
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.innerHTML = t(key);
    }
  });

  // Elements with data-i18n-title (tooltip / title)
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      el.setAttribute('title', t(key));
    }
  });

  // Elements with data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      el.setAttribute('placeholder', t(key));
    }
  });

  // Update language selector button and menu in header
  const currentLangLabel = document.getElementById('currentLangLabel');
  if (currentLangLabel) {
    currentLangLabel.textContent = currentLanguage === 'pt-BR' ? 'PT-BR' : 'EN';
  }

  // Update language select field inside settings modal
  const inputModalLanguage = document.getElementById('inputModalLanguage');
  if (inputModalLanguage && inputModalLanguage.value !== currentLanguage) {
    inputModalLanguage.value = currentLanguage;
  }

  // Update dropdown items
  document.querySelectorAll('.lang-dropdown-item').forEach((item) => {
    const itemLang = item.getAttribute('data-lang');
    const isActive = itemLang === currentLanguage;
    item.classList.toggle('is-active', isActive);
    const check = item.querySelector('.lang-check');
    if (check) {
      check.style.display = isActive ? 'inline' : 'none';
    }
  });
}

/**
 * Sets active language and notifies components
 */
export function setLanguage(newLang, notify = true) {
  const targetLang = (newLang === 'pt-BR' || newLang === 'pt') ? 'pt-BR' : 'en';
  currentLanguage = targetLang;

  try {
    localStorage.setItem(STORAGE_LANG_KEY, targetLang);
  } catch {}

  applyTranslations();

  if (notify) {
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: targetLang } }));
  }
}

/**
 * Initializes internationalization subsystem
 */
export function initI18n(initialBackendLang = null) {
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_LANG_KEY);
  } catch {}

  // Priority: 1) Preference saved in localStorage, 2) Backend configuration, 3) English (default)
  const defaultLang = saved || initialBackendLang || 'en';
  setLanguage(defaultLang, false);
}
