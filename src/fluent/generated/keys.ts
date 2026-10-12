import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    'acl-lens-menu': {
                        table: 'sys_app_application'
                        id: '161f1f9f80b94435bd7d75e0a1d6fa31'
                    }
                    'acl-lens-module-ai-providers': {
                        table: 'sys_app_module'
                        id: 'bf64c843f86b4cbdbfb1e32a9ebe4ade'
                    }
                    'acl-lens-module-config-separator': {
                        table: 'sys_app_module'
                        id: 'e260c4b2848c4915afba5c60123a4316'
                    }
                    'acl-lens-module-dashboard': {
                        table: 'sys_app_module'
                        id: 'e0ce61f30d474ad2af070e2b20d70e5e'
                    }
                    'acl-lens-module-history': {
                        table: 'sys_app_module'
                        id: 'cd347776d3ff45fc9de729df17b03a28'
                    }
                    'acl-lens-module-mcp': {
                        table: 'sys_app_module'
                        id: 'fac3ff08923649faa2b0e830508f9a57'
                    }
                    'acl-lens-module-properties': {
                        table: 'sys_app_module'
                        id: 'd54e78754691478eb0870fcd8d1abf61'
                    }
                    'acl-lens-module-run-records': {
                        table: 'sys_app_module'
                        id: '47d2d6206a8542f1879d43719c071994'
                    }
                    'acl-lens-module-workspace': {
                        table: 'sys_app_module'
                        id: '0ebe9a200b824fc8917083cfa82717df'
                    }
                    'ai-conv-delete': {
                        table: 'sys_security_acl'
                        id: '5ba569c234bc4158af2bcfe072678b3e'
                    }
                    'ai-conv-field-read': {
                        table: 'sys_security_acl'
                        id: '1f8ce15c9ef5478f81200ebcfddfe908'
                    }
                    'ai-conv-read': {
                        table: 'sys_security_acl'
                        id: '77bcf1f0a31a41f09d6f285e7e5b056b'
                    }
                    'ai-msg-field-read': {
                        table: 'sys_security_acl'
                        id: 'bed283885b5846f2942863286d85167a'
                    }
                    'ai-msg-read': {
                        table: 'sys_security_acl'
                        id: '5bf992bb05af41e092c79547b304a35d'
                    }
                    'ai-provider-create': {
                        table: 'sys_security_acl'
                        id: 'e050f47ab1884298a3a1c29f6022ee1c'
                    }
                    'ai-provider-delete': {
                        table: 'sys_security_acl'
                        id: '41fad204ca424f5d9f48c4e9288ea3eb'
                    }
                    'ai-provider-field-read': {
                        table: 'sys_security_acl'
                        id: '9434ac6e2f044f8e8fc0c4e52ae97fb6'
                    }
                    'ai-provider-field-write': {
                        table: 'sys_security_acl'
                        id: '536c3aa8ae3f488a8951b6483ff29411'
                    }
                    'ai-provider-now-assist': {
                        table: 'x_acllens_ai_provider'
                        id: 'aac2a8f37638451c88f2773d94010762'
                    }
                    'ai-provider-read': {
                        table: 'sys_security_acl'
                        id: 'd66e774684b84195b6e57bd6abeb11f4'
                    }
                    'ai-provider-test': {
                        table: 'sys_ui_action'
                        id: '62c339ed514f43238ef47e17e44e3d4f'
                    }
                    'ai-provider-write': {
                        table: 'sys_security_acl'
                        id: '14ba43d9c6914d9da0b4a9570e161bbe'
                    }
                    'app.css': {
                        table: 'sys_ux_theme_asset'
                        id: '7c8771743e854ee69911415813e33a84'
                        deleted: true
                    }
                    bom_json: {
                        table: 'sys_module'
                        id: '7b4d9c6718864c6b9e532581da9b805d'
                    }
                    'dashboard-create': {
                        table: 'sys_security_acl'
                        id: '4e51fbb28faa405eb2c379111fa3e197'
                    }
                    'dashboard-delete': {
                        table: 'sys_security_acl'
                        id: '94dcf0b2b9ac4ce18e8c4675c6807e84'
                    }
                    'dashboard-field-read': {
                        table: 'sys_security_acl'
                        id: 'fe082e663dd742c3b5878e498df7c49b'
                    }
                    'dashboard-field-write': {
                        table: 'sys_security_acl'
                        id: 'f83ad8e2fb6249eb98f92c28a25989fc'
                    }
                    'dashboard-read': {
                        table: 'sys_security_acl'
                        id: 'e54aa2b0976f43ddb1668d71f3422178'
                    }
                    'dashboard-write': {
                        table: 'sys_security_acl'
                        id: '35b0100da1b342f88cf48a976588f347'
                    }
                    'job-history-retention': {
                        table: 'sysauto_script'
                        id: '676c938240454f26930263745d8d9e1b'
                    }
                    'lens-api': {
                        table: 'sys_ws_definition'
                        id: '76dc4ad6505e4e62bb7c4cc3b4955e34'
                    }
                    'lens-api-acl-detail': {
                        table: 'sys_ws_operation'
                        id: 'fb9b75b541ee4603baa6bb4fc90795de'
                    }
                    'lens-api-ai-chat': {
                        table: 'sys_ws_operation'
                        id: 'b2df6953b2974a30ac310ef919312b78'
                    }
                    'lens-api-ai-conversation': {
                        table: 'sys_ws_operation'
                        id: 'e18c304a65bb4673b42272c77f8cd0fa'
                    }
                    'lens-api-ai-conversations': {
                        table: 'sys_ws_operation'
                        id: '51e94168c1b5443f905ea6e84fb07874'
                    }
                    'lens-api-ai-status': {
                        table: 'sys_ws_operation'
                        id: 'bad5e74385b340c6be11847b5d4a6bee'
                    }
                    'lens-api-dashboard': {
                        table: 'sys_ws_operation'
                        id: '302933a8145442289753bea08b4a91c8'
                    }
                    'lens-api-dashboard-data': {
                        table: 'sys_ws_operation'
                        id: '151204e82fac4d72b76330d79bca8797'
                    }
                    'lens-api-dashboard-reset': {
                        table: 'sys_ws_operation'
                        id: 'c06c8eaa9c264fb6ae5c949ed7b0c66c'
                    }
                    'lens-api-dashboard-save': {
                        table: 'sys_ws_operation'
                        id: 'df19b8719b7445febc0a66b405688ba5'
                    }
                    'lens-api-fields': {
                        table: 'sys_ws_operation'
                        id: '1a3cfc1435694d068f2978896c6188ee'
                    }
                    'lens-api-fields-subjects': {
                        table: 'sys_ws_query_parameter'
                        id: '7fde6e5df0a045c180a65152d2000f75'
                    }
                    'lens-api-fields-table': {
                        table: 'sys_ws_query_parameter'
                        id: '30a2e555144f442b855e1b7955c5564a'
                    }
                    'lens-api-history-clear': {
                        table: 'sys_ws_operation'
                        id: 'd167dc6ca9a849dcb2858add025cd241'
                    }
                    'lens-api-history-preview': {
                        table: 'sys_ws_operation'
                        id: '1c55c0bbea864c6e9df54adc33580bb2'
                    }
                    'lens-api-mcp': {
                        table: 'sys_ws_operation'
                        id: '2a361c7c2a144813bd8cf41ce5d94bcb'
                    }
                    'lens-api-mcp-info': {
                        table: 'sys_ws_operation'
                        id: '7806d554744c4ee8a3909031b4a42b0c'
                    }
                    'lens-api-me': {
                        table: 'sys_ws_operation'
                        id: 'e84e20c66d584fce8074ca10bb8da6fe'
                    }
                    'lens-api-report-delete': {
                        table: 'sys_ws_operation'
                        id: '0a2e3728989444f3bea205ae2de2a277'
                    }
                    'lens-api-report-preview': {
                        table: 'sys_ws_operation'
                        id: '7b90174e9d0c41b1b3e4cc76a346a775'
                    }
                    'lens-api-report-save': {
                        table: 'sys_ws_operation'
                        id: '9781f931270747eabd553e13eb725bd0'
                    }
                    'lens-api-reports': {
                        table: 'sys_ws_operation'
                        id: '9e054af7760c48f9984c7a3da5e58fd0'
                    }
                    'lens-api-run-archive': {
                        table: 'sys_ws_operation'
                        id: 'c1cedb569d0f46cd8463ce256a11a9b2'
                    }
                    'lens-api-run-delete': {
                        table: 'sys_ws_operation'
                        id: '26f5af71a8574955bc4f22e1d3a115fb'
                    }
                    'lens-api-run-get': {
                        table: 'sys_ws_operation'
                        id: '53b0b8261e4440b8a1a6f17313149f60'
                    }
                    'lens-api-run-rerun': {
                        table: 'sys_ws_operation'
                        id: 'd92ef1adc3854caea5b06b4212407fed'
                    }
                    'lens-api-runs-get': {
                        table: 'sys_ws_operation'
                        id: 'ce1c0f49569047b0a4b94a2582be2224'
                    }
                    'lens-api-runs-post': {
                        table: 'sys_ws_operation'
                        id: 'd5a7f1d5076e4fb08373be776bd67212'
                    }
                    'lens-api-scopes': {
                        table: 'sys_ws_operation'
                        id: 'a7ba8ff14d6f4e48b7132f7ab4dfb174'
                    }
                    'lens-api-settings-get': {
                        table: 'sys_ws_operation'
                        id: 'd82010abc9ec4e6dbb7408bb7ff739de'
                    }
                    'lens-api-settings-put': {
                        table: 'sys_ws_operation'
                        id: '8fdee57792284394b38d64a8606b4183'
                    }
                    'lens-api-subjects': {
                        table: 'sys_ws_operation'
                        id: 'ade489ee6265409abedd286c8990e1bf'
                    }
                    'lens-api-subjects-q': {
                        table: 'sys_ws_query_parameter'
                        id: '6afa24c92cfe4214b80a0deb81f2aa4e'
                    }
                    'lens-api-subjects-type': {
                        table: 'sys_ws_query_parameter'
                        id: '9ff6919fe0dc41a6af6d6388cad2a7a6'
                    }
                    'lens-api-tables': {
                        table: 'sys_ws_operation'
                        id: '09f2ba0c9e9a4d94bd0d751b50fdc531'
                    }
                    package_json: {
                        table: 'sys_module'
                        id: 'ffa199bde3194b72849201ccefb7b0fb'
                    }
                    'prop-history-enabled': {
                        table: 'sys_properties'
                        id: 'eee877b8277f4df399a5145bf6c7c9fd'
                    }
                    'prop-mcp-enabled': {
                        table: 'sys_properties'
                        id: 'b3224649a67241bb9b3bde1e65573e21'
                    }
                    'prop-retention-action': {
                        table: 'sys_properties'
                        id: '3460de98ac4e4a89ba127966844e042f'
                    }
                    'prop-retention-days': {
                        table: 'sys_properties'
                        id: '3c539a50689d4a0ab36491cf58e0c232'
                    }
                    'prop-retention-enabled': {
                        table: 'sys_properties'
                        id: 'ac698b19e7f04ffa9b0f8262fecb8edf'
                    }
                    'prop-ui-instance-theme': {
                        table: 'sys_properties'
                        id: '7e52628e72ad439c9b68b5ee00ee6959'
                    }
                    'report-access-by-subject': {
                        table: 'x_acllens_report'
                        id: 'f3b5dbeb7e85418ba87164a8bf9260a4'
                    }
                    'report-access-gained': {
                        table: 'x_acllens_report'
                        id: 'c45b40965aaa4441a517f010ab193171'
                    }
                    'report-access-glance': {
                        table: 'x_acllens_report'
                        id: '101a12e620a849a1a510ce5551eadc06'
                    }
                    'report-create': {
                        table: 'sys_security_acl'
                        id: '1b54958f144140fcb5e19e75e3fc911a'
                    }
                    'report-data-filters': {
                        table: 'x_acllens_report'
                        id: '498bc2b02c7f40d38704cc64cb226739'
                    }
                    'report-delete': {
                        table: 'sys_security_acl'
                        id: 'f0cfb4b0340a43f290ff7e1aecdf60d5'
                    }
                    'report-differences': {
                        table: 'x_acllens_report'
                        id: '978ff4b2802f4c3da10095a871378707'
                    }
                    'report-field-read': {
                        table: 'sys_security_acl'
                        id: '680818f6b19f4cf7a0858aeb4b8a667f'
                    }
                    'report-field-write': {
                        table: 'sys_security_acl'
                        id: 'c87f952d100d427a99488f8b0d73b278'
                    }
                    'report-high-risk-tables': {
                        table: 'x_acllens_report'
                        id: '254189b34b1a4590a6e3fa3ba4c93c8c'
                    }
                    'report-inactive': {
                        table: 'x_acllens_report'
                        id: '61b209e777cf4afbad1234d2cb18b8aa'
                    }
                    'report-machine-changes': {
                        table: 'x_acllens_report'
                        id: '4d413fd5544f4747b1dd417b80fb0674'
                    }
                    'report-no-rule': {
                        table: 'x_acllens_report'
                        id: '79f1fa737f98486db02ac46ea01c58f3'
                    }
                    'report-open-acls': {
                        table: 'x_acllens_report'
                        id: 'eae14a70aff947f18c1a689c55ddb809'
                    }
                    'report-privileged': {
                        table: 'x_acllens_report'
                        id: 'ebc23cf33e134bbc89efa9869d15071d'
                    }
                    'report-read': {
                        table: 'sys_security_acl'
                        id: 'dddfeb56f6794a53946b73eb38e1da06'
                    }
                    'report-scripted': {
                        table: 'x_acllens_report'
                        id: 'd9f4aa8f944a4a63a1be8efd51a1628d'
                    }
                    'report-shared-write': {
                        table: 'sys_security_acl'
                        id: '04127795d7814941947b1db3943dae73'
                    }
                    'report-unshared-roles': {
                        table: 'x_acllens_report'
                        id: '1acd8e7cc29a406fa9114bea150e3cb9'
                    }
                    'report-write': {
                        table: 'sys_security_acl'
                        id: '79399a59c25743cb990e0bc0368ade63'
                    }
                    'run-create': {
                        table: 'sys_security_acl'
                        id: '208f63fc7f9947dfa26041388e4e554b'
                    }
                    'run-data-create': {
                        table: 'sys_security_acl'
                        id: '1f3bf648c09e451da19ff4f6b6e35040'
                    }
                    'run-data-delete': {
                        table: 'sys_security_acl'
                        id: '2325f069783b43069c0134ec23627c72'
                    }
                    'run-data-field-read': {
                        table: 'sys_security_acl'
                        id: '6a7e673629c243d8a145954993002902'
                    }
                    'run-data-read': {
                        table: 'sys_security_acl'
                        id: 'd350ff8e023b4636944b714f734b676c'
                    }
                    'run-delete': {
                        table: 'sys_security_acl'
                        id: 'e2eb4c4d3eb14b9dbd3ef352b7252da3'
                    }
                    'run-field-read': {
                        table: 'sys_security_acl'
                        id: '03847742fb81430c9d9b0bd37767620e'
                    }
                    'run-field-write': {
                        table: 'sys_security_acl'
                        id: 'b1573a35e0784a95a32e23e206274d5f'
                    }
                    'run-read': {
                        table: 'sys_security_acl'
                        id: '3604c0a759524d9bb828d5b06017e7d5'
                    }
                    'run-write': {
                        table: 'sys_security_acl'
                        id: '20b80a6f8d92461fab3f41040125c2ae'
                    }
                    src_server_admin_settings_ts: {
                        table: 'sys_module'
                        id: '5dc226907e994222a3b425112fb46a92'
                    }
                    src_server_ai_agent_ts: {
                        table: 'sys_module'
                        id: '3b503efc6fde44f8a88e2c6425607d0d'
                    }
                    'src_server_ai_evaluation-view_ts': {
                        table: 'sys_module'
                        id: '59d03bb6dde6447bb6f9719ff7a54548'
                    }
                    src_server_ai_guidance_ts: {
                        table: 'sys_module'
                        id: 'fa40473f90d2429c93355aa32f6c7682'
                    }
                    src_server_ai_mcp_ts: {
                        table: 'sys_module'
                        id: '9c8700f71ea448f0b8511c967b3c59ba'
                    }
                    'src_server_ai_provider-safety_ts': {
                        table: 'sys_module'
                        id: 'e09f3e08b1654f569202335d50414fda'
                    }
                    'src_server_ai_provider-test_ts': {
                        table: 'sys_module'
                        id: 'f1a8037eefab41678261742aa7ab4b95'
                    }
                    src_server_ai_providers_ts: {
                        table: 'sys_module'
                        id: 'bfde1904ea80455a86febc1d8469b47f'
                    }
                    src_server_ai_tools_ts: {
                        table: 'sys_module'
                        id: 'cc2cd35bd23947129d075705026f8736'
                    }
                    src_server_engine_account_ts: {
                        table: 'sys_module'
                        id: '328fecfc109442139e00292d808403ad'
                    }
                    'src_server_engine_acl-detail_ts': {
                        table: 'sys_module'
                        id: '1a72a96dc4bd45c4943c3c9424f88111'
                    }
                    'src_server_engine_acl-index_ts': {
                        table: 'sys_module'
                        id: 'e3fc7b24821942c2a7a2dafd0a331188'
                    }
                    src_server_engine_analyze_ts: {
                        table: 'sys_module'
                        id: '55d7894a01bf402285da419490b4ab04'
                    }
                    src_server_engine_attributes_ts: {
                        table: 'sys_module'
                        id: '313d636c66d74435852f9ac86abb592d'
                    }
                    src_server_engine_compare_ts: {
                        table: 'sys_module'
                        id: '048ccb0a73e14d1f989d5cb3544f4646'
                    }
                    'src_server_engine_data-filters_ts': {
                        table: 'sys_module'
                        id: '0864d170e85142c7b53650d817019a3f'
                    }
                    src_server_engine_evaluator_ts: {
                        table: 'sys_module'
                        id: '70b3ae7d63f34fd281ba204758dcc20e'
                    }
                    src_server_engine_glide_ts: {
                        table: 'sys_module'
                        id: '8b7ee9cd0aef41fe807b8e1c877b278d'
                    }
                    'src_server_engine_report-measures_ts': {
                        table: 'sys_module'
                        id: '17ef6f6e7114462f8cae0cb4c7f56608'
                    }
                    src_server_engine_runs_ts: {
                        table: 'sys_module'
                        id: 'fdd88939314f46da9357a1c2815e816e'
                    }
                    src_server_engine_schema_ts: {
                        table: 'sys_module'
                        id: '096e16fe6c584ca6a814bb6462cdde29'
                    }
                    src_server_engine_search_ts: {
                        table: 'sys_module'
                        id: '64135035024749d195d34d5a3cfb2fd7'
                    }
                    src_server_engine_storage_ts: {
                        table: 'sys_module'
                        id: 'e170f2bcb9ce4d5f8f05bcbb7dd69c01'
                    }
                    src_server_engine_subjects_ts: {
                        table: 'sys_module'
                        id: 'f10f4620aef941368913caf02e42c68c'
                    }
                    src_server_engine_types_ts: {
                        table: 'sys_module'
                        id: '7c1b710200e74adcb0cc56bd18a1c1c3'
                    }
                    src_server_reports_reports_ts: {
                        table: 'sys_module'
                        id: '4f370022c4784c139442aeae838bf3bf'
                    }
                    'src_server_rest_ai-handlers_ts': {
                        table: 'sys_module'
                        id: '33eae166dd0e493c9c0f8c3bdd31da07'
                    }
                    src_server_rest_handlers_ts: {
                        table: 'sys_module'
                        id: '62d2e2e3d82c4422b96f304d64e7f583'
                    }
                    'xscope-exec-oneextend': {
                        table: 'sys_scope_privilege'
                        id: '4fea21cd39d449008e91ede1b3da4110'
                    }
                    'xscope-read-sys_db_object': {
                        table: 'sys_scope_privilege'
                        id: '8f4c6c87c3ff445fbe740a13fee2c199'
                    }
                    'xscope-read-sys_dictionary': {
                        table: 'sys_scope_privilege'
                        id: '4501ea9fa6ea4a42931de5e88982659f'
                    }
                    'xscope-read-sys_group_has_role': {
                        table: 'sys_scope_privilege'
                        id: 'f380f247685c4920bd661e6c3de3254c'
                    }
                    'xscope-read-sys_one_extend_capability': {
                        table: 'sys_scope_privilege'
                        id: '2f2ae2a370d94c10924220e49f2d41d4'
                    }
                    'xscope-read-sys_scope': {
                        table: 'sys_scope_privilege'
                        id: '262b714164574d5bbb5f70a618008a61'
                    }
                    'xscope-read-sys_security_acl': {
                        table: 'sys_scope_privilege'
                        id: '89c653df492847cb82ee289622d17f91'
                    }
                    'xscope-read-sys_security_acl_role': {
                        table: 'sys_scope_privilege'
                        id: '90badbdb8953442e87c495f0d720e864'
                    }
                    'xscope-read-sys_security_attribute': {
                        table: 'sys_scope_privilege'
                        id: 'fd643f48c95f4a1ca05c9177269a2602'
                    }
                    'xscope-read-sys_security_data_filter': {
                        table: 'sys_scope_privilege'
                        id: '29947ea9d9ef46908aa8b76d8409781e'
                    }
                    'xscope-read-sys_security_operation': {
                        table: 'sys_scope_privilege'
                        id: 'edb398d4a7a04c8a80732cb7ccc01631'
                    }
                    'xscope-read-sys_user': {
                        table: 'sys_scope_privilege'
                        id: '9ba789d31fa24b508f0295055e2275da'
                    }
                    'xscope-read-sys_user_group': {
                        table: 'sys_scope_privilege'
                        id: 'c4da9e8ec93d4cbd8dc6f5b37e7703de'
                    }
                    'xscope-read-sys_user_has_role': {
                        table: 'sys_scope_privilege'
                        id: '2acbc2ae35ea4fa58d9fefdb2cf0dea2'
                    }
                    'xscope-read-sys_user_role': {
                        table: 'sys_scope_privilege'
                        id: '8132ca1c58434c9ca6612e277e9eea63'
                    }
                    'xscope-read-sys_user_role_contains': {
                        table: 'sys_scope_privilege'
                        id: '3fa73ab2192c4e049eff62ec2b565398'
                    }
                }
                composite: [
                    {
                        table: 'sys_dictionary'
                        id: '00a6248437ee49279a0fa4b0e11d8c4a'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'model'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '02266a2d470b4c0a926d23f94320cc0e'
                        key: {
                            name: 'x_acllens_ai_message'
                            element: 'content'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '02e3dc95e81f42acbe8af8081f932df1'
                        key: {
                            sys_security_acl: 'd66e774684b84195b6e57bd6abeb11f4'
                            sys_user_role: {
                                id: '7e2edc83c71f4b3191d59ff5fc5504b6'
                                key: {
                                    name: 'x_acllens.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '02f546445f814f2081146439403007fd'
                        key: {
                            name: 'x_acllens_ai_conversation'
                            element: 'message_count'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '0362240f2c1149cbad51704bf6587038'
                        key: {
                            name: 'x_acllens_report'
                            element: 'category'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_index'
                        id: '03bdb51509854e879a2b0a189d58365e'
                        key: {
                            logical_table_name: 'x_acllens_run_data'
                            col_name_string: 'run,kind,seq'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '03dad74d97bc4203b9921e92438feb77'
                        key: {
                            name: 'x_acllens_run'
                            element: 'original_run'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: '04413b3fc41a4d0faaf8efd97a72db45'
                        key: {
                            name: 'x_acllens_ai_conversation'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '059b54aae74e4fc6a61f06801e04ffbb'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'timeout_seconds'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: '05d45544e2924eb785d8dbc70b7d797d'
                        key: {
                            name: 'x_acllens_run'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '061727cfc1b644dd99bfb7c32bf34871'
                        key: {
                            name: 'x_acllens_run'
                            element: 'error_message'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '066ae0d12549424399235f1e2caafb5d'
                        key: {
                            sys_security_acl: '2325f069783b43069c0134ec23627c72'
                            sys_user_role: {
                                id: '7e2edc83c71f4b3191d59ff5fc5504b6'
                                key: {
                                    name: 'x_acllens.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '06a715f617694d3faf9f92be9e4b6fa0'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'name'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '07a2d19bfe9345db98eaf61bc6d4f547'
                        key: {
                            name: 'x_acllens_run'
                            element: 'subjects'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '09c844bb4fa748f4915ccd8f810375ea'
                        key: {
                            name: 'x_acllens_report'
                            element: 'description'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_number'
                        id: '09e4f4139197406c99459a3b017868c0'
                        key: {
                            category: 'x_acllens_run'
                            prefix: 'ALR'
                        }
                    },
                    {
                        table: 'sys_choice_set'
                        id: '0a0b075054d94a958367d289489dd404'
                        key: {
                            name: 'x_acllens_run'
                            element: 'run_type'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '0a2178b190f242f3a3a1c81e23cc39c8'
                        key: {
                            name: 'x_acllens_report'
                            element: 'options'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: '0a382136d6944509b6a1cc63648fcd6f'
                        key: {
                            name: 'x_acllens_ai_provider'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '0b7ccc32a1c1435ca3e6f7707232f703'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'capability'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '0c5b7ec76a074304a4e5291b7d532111'
                        key: {
                            name: 'x_acllens_report'
                            element: 'options'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '0ce07e203254419198281698ba42418c'
                        key: {
                            name: 'x_acllens_report'
                            element: 'copied_from'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '0d790dba2bca44fdb383d7885bc7451b'
                        key: {
                            name: 'x_acllens_run'
                            element: 'summary'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: '0e9939f0c44b4e2aaf8e12756b8960f0'
                        key: {
                            name: 'x_acllens_run'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '0fe2a581ad0142548e2265152cf8a18e'
                        key: {
                            name: 'x_acllens_dashboard'
                            element: 'owner'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: '1169e61c2d9c4795b354114dfdba769a'
                        key: {
                            name: 'x_acllens_report'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '12382c038fcf489b8636c924d17ca737'
                        key: {
                            name: 'x_acllens_run'
                            element: 'run_by'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '148b68d0b95842f3926092e5a8b34bf3'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'endpoint'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '15751dee4ae14b04b59a0ac12e8fee92'
                        key: {
                            name: 'x_acllens_run'
                            element: 'status'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '15827673010441d78e15c0af603022d9'
                        key: {
                            name: 'x_acllens_ai_message'
                            element: 'provider_name'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '15882221e32140338cd9e700db3ad553'
                        key: {
                            name: 'x_acllens_run'
                            element: 'run_type'
                            value: 'analyze'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '175ef8acbab44380967eceffbbf06be7'
                        key: {
                            sys_security_acl: '03847742fb81430c9d9b0bd37767620e'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '182093b6e29c4fefab5d77b13af156ab'
                        deleted: true
                        key: {
                            application_file: '9d139efa723644c8a2f7a3d613006397'
                            source_artifact: '94088204900c4b108266e921e2676675'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '1923c5dfafb242a695bc4a7b88cd1a7f'
                        key: {
                            name: 'x_acllens_report'
                            element: 'chart'
                            value: 'bar'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '1af4aab984b04beb82d05225a1a0d46c'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'api_key'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '1be532c38f6c43be851b1e44c51f3dab'
                        key: {
                            name: 'x_acllens_run'
                            element: 'number'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '1e7c5b9fc0c84bda84524e1d888471a8'
                        key: {
                            name: 'x_acllens_report'
                            element: 'shared'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '1f16d64ec1e54d0c8ad8423edc36c94a'
                        key: {
                            name: 'x_acllens/main.js.map'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '1f3f822ae3204c769f68aa0d4d1d6a89'
                        key: {
                            name: 'x_acllens_report'
                            element: 'shared'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '219f324cce1546458f437ac72e35756e'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '224860585f414a02bd84fd6922da21c6'
                        key: {
                            name: 'x_acllens_run'
                            element: 'run_type'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '237ddd2b4cfe405c8a19a468decfc484'
                        key: {
                            name: 'x_acllens_report'
                            element: 'system'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '23c0109f9cd8421489885c6c656dcfc0'
                        key: {
                            sys_security_acl: '94dcf0b2b9ac4ce18e8c4675c6807e84'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '25816f888c464562a862035598867362'
                        key: {
                            name: 'x_acllens_report'
                            element: 'owner'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '27086f6f300443f3ac5f6ccebab2af0b'
                        key: {
                            sys_security_acl: '680818f6b19f4cf7a0858aeb4b8a667f'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '2804a8a865334c4aa9bb1b4fa63b9ea1'
                        key: {
                            name: 'x_acllens_ai_message'
                            element: 'provider_name'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '283f77e13ffc44968fe278bb57b4c0b5'
                        key: {
                            sys_security_acl: 'b1573a35e0784a95a32e23e206274d5f'
                            sys_user_role: {
                                id: '7e2edc83c71f4b3191d59ff5fc5504b6'
                                key: {
                                    name: 'x_acllens.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '286d11cde67345e2b92d794714ffecea'
                        key: {
                            name: 'x_acllens/main'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '287dde4b6a2d44bea4af9a4634c0a41f'
                        key: {
                            sys_security_acl: '208f63fc7f9947dfa26041388e4e554b'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '2887678df1d14ca689cef10b94e29e00'
                        key: {
                            name: 'x_acllens_report'
                            element: 'measure'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: '2a4db28520e449c288c6267af8ce6d61'
                        key: {
                            name: 'x_acllens_run_data'
                        }
                    },
                    {
                        table: 'sys_ui_policy_action'
                        id: '2a7a5a8db25f4a5ba3ba84f70f0de824'
                        key: {
                            ui_policy: {
                                id: 'efba9cb7fef042aa9923cd1a2b8e7d54'
                                key: {
                                    table: 'x_acllens_ai_provider'
                                    short_description: 'Show only the fields used by the selected provider type'
                                }
                            }
                            field: 'capability'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '2d983e86490b47b5a8d92f2539b5a649'
                        key: {
                            name: 'x_acllens_report'
                            element: 'chart'
                            value: 'donut'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '2dac94979ed94d7fb6ec7b353dc31852'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'allow_custom_endpoint'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '339a2183eaf04879bf76e0cfb57b37a0'
                        key: {
                            name: 'x_acllens_run'
                            element: 'status'
                            value: 'complete'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '353de1ffa5224750bc5a9d25baa5ef19'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'order'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '35cfc77ff5d742fd838aee6ac8037d56'
                        key: {
                            name: 'x_acllens_ai_message'
                            element: 'role'
                            value: 'user'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '36b134a85af649cd8d1a8737bfbf6ebd'
                        key: {
                            name: 'x_acllens_run'
                            element: 'name'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '37dfba1a499246b3bafc2537e1407dd2'
                        key: {
                            name: 'x_acllens_run'
                            element: 'archived'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '382e8cc244fd4ff6972da386fc96722c'
                        key: {
                            name: 'x_acllens_ai_conversation'
                            element: 'title'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '3a94f531ae524eeabe840910aef50c0c'
                        key: {
                            sys_security_acl: '77bcf1f0a31a41f09d6f285e7e5b056b'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '3b2852d614954439aa55ee437c4e4f20'
                        key: {
                            name: 'x_acllens_ai_conversation'
                            element: 'run'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '3c46c14cba944d25bde80389a2404122'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'capability_id'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '3c5e658773cd4b8aac64260338af868c'
                        key: {
                            name: 'x_acllens_ai_message'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '3e01b708a62a49aa9487ed17ec8d1926'
                        key: {
                            sys_security_acl: '5bf992bb05af41e092c79547b304a35d'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: '3e026c506a924bfd82aee879df1fce9e'
                        key: {
                            name: 'x_acllens_ai_conversation'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '3ee57bf3c4674949af0c2e521741bb6d'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'model'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '3f334b60bf8143bda564a7be1e71e6d3'
                        key: {
                            sys_security_acl: '1f8ce15c9ef5478f81200ebcfddfe908'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '41c170d0d5d945019ab65404287acfbc'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'timeout_seconds'
                        }
                    },
                    {
                        table: 'sys_ui_policy_action'
                        id: '4212881c1bb046feaa685769c7b21a67'
                        key: {
                            ui_policy: {
                                id: 'efba9cb7fef042aa9923cd1a2b8e7d54'
                                key: {
                                    table: 'x_acllens_ai_provider'
                                    short_description: 'Show only the fields used by the selected provider type'
                                }
                            }
                            field: 'model'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '42d97c71ba1541398a0e41093fc09c1d'
                        key: {
                            name: 'x_acllens_dashboard'
                            element: 'run'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_user_role'
                        id: '43149c594d5a422ebdd87be3a3c4ed08'
                        key: {
                            name: 'x_acllens.user'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '44671510c2944874bc216f8e2c86810e'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'capability'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '45a75332dc7e44c393c47635dc74851d'
                        key: {
                            name: 'x_acllens_report'
                            element: 'description'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '4aa6c86b9931415d849a4c2295b1f826'
                        key: {
                            sys_security_acl: '4e51fbb28faa405eb2c379111fa3e197'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '4d8867c983bc4c98a2f00f9bcdf8e88f'
                        key: {
                            name: 'x_acllens_ai_message'
                            element: 'role'
                            value: 'assistant'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '4dfd1ddce04c40b9b823fe1227c3c78b'
                        key: {
                            sys_security_acl: 'fe082e663dd742c3b5878e498df7c49b'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ws_query_parameter_map'
                        id: '4e75e6084966464b873efe1d38d6bb5a'
                        key: {
                            web_service_operation: 'ade489ee6265409abedd286c8990e1bf'
                            web_service_query_parameter: '6afa24c92cfe4214b80a0deb81f2aa4e'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '4e94f4dd958f4ba4b369cdad39d862ff'
                        key: {
                            name: 'x_acllens_report'
                            element: 'chart'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '4ecd78cf1f8e4b79af44d19d90e5b88d'
                        key: {
                            name: 'x_acllens_run_data'
                            element: 'run'
                        }
                    },
                    {
                        table: 'sys_ui_action_role'
                        id: '4ee32c0da57441a3ad1de4f2c0761105'
                        key: {
                            sys_ui_action: '62c339ed514f43238ef47e17e44e3d4f'
                            sys_user_role: {
                                id: '7e2edc83c71f4b3191d59ff5fc5504b6'
                                key: {
                                    name: 'x_acllens.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '4f087687fabb4e17b2e8a7fecd886060'
                        key: {
                            name: 'x_acllens_run'
                            element: 'status'
                            value: 'error'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '51ddbd6310734a9b8b21405e7d4036d5'
                        key: {
                            name: 'x_acllens_dashboard'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '526ad3d55c0e41f6b83e6161150d4565'
                        key: {
                            name: 'x_acllens_ai_conversation'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '53cb8efb747e44c892aaf5d47fb9cc45'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'type'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '5478822d88d04034b19c2ae52e93ac10'
                        key: {
                            name: 'x_acllens_dashboard'
                            element: 'layout'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice_set'
                        id: '57b799150cef416d9e62c5381bb22872'
                        key: {
                            name: 'x_acllens_report'
                            element: 'chart'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '5861031d7ea0427fada7c4c539fee292'
                        key: {
                            name: 'x_acllens_run_data'
                            element: 'kind'
                        }
                    },
                    {
                        table: 'sys_ui_policy_action'
                        id: '58f4d5896a484c01963225438210cae7'
                        key: {
                            ui_policy: {
                                id: 'efba9cb7fef042aa9923cd1a2b8e7d54'
                                key: {
                                    table: 'x_acllens_ai_provider'
                                    short_description: 'Show only the fields used by the selected provider type'
                                }
                            }
                            field: 'allow_custom_endpoint'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '5902fabfb163434f8e10fbd07df04180'
                        key: {
                            name: 'x_acllens_ai_conversation'
                            element: 'provider'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '5a195fc4e26d45949fad7b39eb256b8f'
                        key: {
                            name: 'x_acllens_report'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_user_role_contains'
                        id: '5a7e10c35c144b11bf5ebbf5169d4c11'
                        key: {
                            role: {
                                id: '7e2edc83c71f4b3191d59ff5fc5504b6'
                                key: {
                                    name: 'x_acllens.admin'
                                }
                            }
                            contains: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '5db6708e9899417ca8bf87131863df6f'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'active'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '607063d7b57444b09b5b06e2c8d09327'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'type'
                            value: 'openai_compatible'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '609f6e671e76441fb716718e4b660b07'
                        key: {
                            name: 'x_acllens_ai_message'
                            element: 'seq'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '60c57a1b44544fd3991dde112e3d0c02'
                        key: {
                            name: 'x_acllens_run_data'
                            element: 'seq'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '622f6bfe3f844437a613978db698a153'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '625194f08e204d71a724f8e750a85d3f'
                        key: {
                            name: 'x_acllens_ai_message'
                            element: 'conversation'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '62c4ad160a8143668545ce32f24a2c37'
                        key: {
                            name: 'x_acllens_run'
                            element: 'filter'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '62ed418e68c64567bbefbd30a21da97d'
                        key: {
                            name: 'x_acllens_run_data'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '63e9a99751e84579b086fa4cd53b4cbe'
                        key: {
                            name: 'x_acllens_run'
                            element: 'duration_ms'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '63f83cc357a440dbb2e42bf20ca2ef3e'
                        key: {
                            name: 'x_acllens_ai_message'
                            element: 'role'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '64517a4ef6684c9888a859d71b78e240'
                        key: {
                            name: 'x_acllens_report'
                            element: 'name'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '65c2cc7b47804104b2fda8af152f1c57'
                        key: {
                            sys_security_acl: '536c3aa8ae3f488a8951b6483ff29411'
                            sys_user_role: {
                                id: '7e2edc83c71f4b3191d59ff5fc5504b6'
                                key: {
                                    name: 'x_acllens.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '662c69b2ec56497694ffb8587c76bdc9'
                        key: {
                            name: 'x_acllens_report'
                            element: 'measure'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '6697612e92af493db75db387626dc732'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'type'
                            value: 'azure_openai'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '67447239f2b14bc782d7d9501ec2ca4c'
                        key: {
                            sys_security_acl: 'e050f47ab1884298a3a1c29f6022ee1c'
                            sys_user_role: {
                                id: '7e2edc83c71f4b3191d59ff5fc5504b6'
                                key: {
                                    name: 'x_acllens.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '67b335508e5a462cba9b99d8c9bb0e4c'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'endpoint'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_policy_action'
                        id: '68149477925f473e88cbdc52d3fe95fb'
                        key: {
                            ui_policy: {
                                id: 'efba9cb7fef042aa9923cd1a2b8e7d54'
                                key: {
                                    table: 'x_acllens_ai_provider'
                                    short_description: 'Show only the fields used by the selected provider type'
                                }
                            }
                            field: 'api_key'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '689f6832196147bba1c8569be8602f4d'
                        key: {
                            name: 'x_acllens_run'
                            element: 'run_by'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '699b1c98f8f04d39a3be6c4d80464679'
                        deleted: true
                        key: {
                            application_file: '286d11cde67345e2b92d794714ffecea'
                            source_artifact: '94088204900c4b108266e921e2676675'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '69d9f228b08b4e8a87ff06e6d7a6f6e9'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'allow_custom_endpoint'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '69ead0d9a0bf4048b0ed0f68546e8547'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'name'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '6e1d015add6e467c824bf4718984f9b4'
                        key: {
                            name: 'x_acllens_report'
                            element: 'category'
                            value: 'vulnerability'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '6e1f9ce6bc284710864cf36fd0c30bfc'
                        key: {
                            name: 'x_acllens_ai_conversation'
                            element: 'title'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '70fa4b034232417dab30c5417f9b50a2'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'max_tokens'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '712786270391440aa40953583c74eef2'
                        key: {
                            sys_security_acl: '35b0100da1b342f88cf48a976588f347'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '719ba90636f74863aa32104a9868ecdf'
                        key: {
                            name: 'x_acllens_ai_message'
                            element: 'content'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '72d151eb1fa542bd9f346751b207760b'
                        key: {
                            sys_security_acl: 'bed283885b5846f2942863286d85167a'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '73590b095a284210908e68dd9cda7229'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'type'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '735aa55cf9914f43a57577ae6bd3e71a'
                        key: {
                            name: 'x_acllens_report'
                            element: 'name'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '75b3653a0c9c4a6c832543cddf3466c2'
                        key: {
                            name: 'x_acllens_report'
                            element: 'category'
                            value: 'overview'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '784607d0ed58404ba02767082e69d68c'
                        key: {
                            name: 'x_acllens_dashboard'
                            element: 'run'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '79b453b715024d5abec507d5eff75c01'
                        key: {
                            name: 'x_acllens_ai_message'
                            element: 'tools_used'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '7bcdb2a56d5c438c8974cb967987de0e'
                        key: {
                            name: 'x_acllens_run_data'
                            element: 'kind'
                            value: 'comparison'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '7d9be8c8c02f42f7a953f1671e399912'
                        key: {
                            name: 'x_acllens_run'
                            element: 'status'
                            value: 'running'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '7e276f006e144bee9601dfa97e4620c9'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'is_default'
                        }
                    },
                    {
                        table: 'sys_user_role'
                        id: '7e2edc83c71f4b3191d59ff5fc5504b6'
                        key: {
                            name: 'x_acllens.admin'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '7f5407eb642944758110e8e23f1c99da'
                        key: {
                            name: 'x_acllens_report'
                            element: 'category'
                            value: 'high_risk'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '801055cf1c3740829a89701831b830bb'
                        key: {
                            sys_security_acl: 'd350ff8e023b4636944b714f734b676c'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '806e7dc130b844c896d98742d1de70d6'
                        key: {
                            name: 'x_acllens_run_data'
                            element: 'payload'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '80a3c645ac5f487f9f73eef4abae735e'
                        key: {
                            name: 'x_acllens_report'
                            element: 'copied_from'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '82ffb1c9bb874044a7d98f4311e3b5b7'
                        key: {
                            name: 'x_acllens_report'
                            element: 'category'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '83346bfbbd2b44c88d096d8f6a5651b1'
                        key: {
                            name: 'x_acllens_report'
                            element: 'order'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '834df8cae2a5434d90af2b79ec19b414'
                        key: {
                            name: 'x_acllens_run'
                            element: 'error_message'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '865f261b2301414aa0d36568b76416c6'
                        key: {
                            sys_security_acl: '41fad204ca424f5d9f48c4e9288ea3eb'
                            sys_user_role: {
                                id: '7e2edc83c71f4b3191d59ff5fc5504b6'
                                key: {
                                    name: 'x_acllens.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '86e61d4a9f8743c2900ba0a2ce5dc50c'
                        key: {
                            sys_security_acl: '1f3bf648c09e451da19ff4f6b6e35040'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '86fe009f9b5b4edca7d1651fb0ad11a4'
                        key: {
                            name: 'x_acllens_run'
                            element: 'subject_summary'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '87a232cdf7ca434c87527adedf2a0bbb'
                        key: {
                            sys_security_acl: '04127795d7814941947b1db3943dae73'
                            sys_user_role: {
                                id: '7e2edc83c71f4b3191d59ff5fc5504b6'
                                key: {
                                    name: 'x_acllens.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '8b267085f9d74f74a3eb39c4702222c0'
                        key: {
                            name: 'x_acllens_dashboard'
                            element: 'layout'
                        }
                    },
                    {
                        table: 'sys_ws_query_parameter_map'
                        id: '8ce65b428d35406da3638c875d5746cf'
                        key: {
                            web_service_operation: '1a3cfc1435694d068f2978896c6188ee'
                            web_service_query_parameter: '7fde6e5df0a045c180a65152d2000f75'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '8dc876a6fa8d4014a09d2a28fda663a8'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'max_tokens'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice_set'
                        id: '8f7047d17798420caa7f44e83b39c4f5'
                        key: {
                            name: 'x_acllens_report'
                            element: 'category'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '90606352579844c3a4fcf8a306bfc10b'
                        key: {
                            name: 'x_acllens_run'
                            element: 'status'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '90d7ed21eaf24acbbe8883b7848e444e'
                        key: {
                            name: 'x_acllens_ai_message'
                            element: 'conversation'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '91b95beb163147cfbc7e1a6d5091972c'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'skill_input'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '92bae41a80724c86aac591bed1e06497'
                        key: {
                            name: 'x_acllens_ai_message'
                            element: 'seq'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '93c6ed14c1d845ed8cbda8ff556d68c8'
                        key: {
                            name: 'x_acllens_run'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact'
                        id: '94088204900c4b108266e921e2676675'
                        deleted: true
                        key: {
                            name: 'x_acllens_lens.do - BYOUI Files'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '9483abb7ab704b639ed40138999b37da'
                        key: {
                            name: 'x_acllens_run'
                            element: 'run_type'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '9adcf524d0164948a6582e148c65b9e6'
                        key: {
                            sys_security_acl: '14ba43d9c6914d9da0b4a9570e161bbe'
                            sys_user_role: {
                                id: '7e2edc83c71f4b3191d59ff5fc5504b6'
                                key: {
                                    name: 'x_acllens.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '9b3090a36b61424b808636ff0dd33f6e'
                        key: {
                            name: 'x_acllens_run'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '9b82ff424dae48b2a8d834b2454ec28a'
                        key: {
                            name: 'x_acllens_run'
                            element: 'subject_summary'
                        }
                    },
                    {
                        table: 'sys_ws_query_parameter_map'
                        id: '9beea2936db54f2d9fa5a6da74c447a1'
                        key: {
                            web_service_operation: 'ade489ee6265409abedd286c8990e1bf'
                            web_service_query_parameter: '9ff6919fe0dc41a6af6d6388cad2a7a6'
                        }
                    },
                    {
                        table: 'sys_ui_page'
                        id: '9d139efa723644c8a2f7a3d613006397'
                        key: {
                            endpoint: 'x_acllens_lens.do'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '9f307c89604b4dfea93eda3e71320467'
                        key: {
                            name: 'x_acllens_run_data'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '9f50b703273d4f9aa2fc5fb48d858d99'
                        key: {
                            sys_security_acl: '6a7e673629c243d8a145954993002902'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: 'a099fc25ebb445639bf0ae581a9a54ac'
                        key: {
                            name: 'x_acllens_report'
                        }
                    },
                    {
                        table: 'sys_ui_policy_action'
                        id: 'a09c7fb49ea445949d18e2e84c9a1af5'
                        key: {
                            ui_policy: {
                                id: 'efba9cb7fef042aa9923cd1a2b8e7d54'
                                key: {
                                    table: 'x_acllens_ai_provider'
                                    short_description: 'Show only the fields used by the selected provider type'
                                }
                            }
                            field: 'skill_input'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'a248413eb4134657b75e418d681a3680'
                        key: {
                            name: 'x_acllens_run'
                            element: 'subjects'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: 'a3b268fa48f948878a8447ca229a8f90'
                        deleted: true
                        key: {
                            application_file: '1f16d64ec1e54d0c8ad8423edc36c94a'
                            source_artifact: '94088204900c4b108266e921e2676675'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'a7e3eef0f67d4390b5ee8945d50ab2f7'
                        key: {
                            name: 'x_acllens_report'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'a82722fad0d74b93bf9b75079fa9b340'
                        key: {
                            name: 'x_acllens_report'
                            element: 'chart'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_policy_action'
                        id: 'a86d93a099fd474e90c84498a91a3bd7'
                        key: {
                            ui_policy: {
                                id: 'efba9cb7fef042aa9923cd1a2b8e7d54'
                                key: {
                                    table: 'x_acllens_ai_provider'
                                    short_description: 'Show only the fields used by the selected provider type'
                                }
                            }
                            field: 'endpoint'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'a9471b3e075943958aa1e3ca95d7d306'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'notes'
                        }
                    },
                    {
                        table: 'sys_choice_set'
                        id: 'aa8a508628bf4829b65a48a8fd14d1c3'
                        key: {
                            name: 'x_acllens_run_data'
                            element: 'kind'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'aab95590cd844547a88946689e5f04e5'
                        key: {
                            name: 'x_acllens_report'
                            element: 'chart'
                            value: 'tile'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'ab909079999d4c1c9547f960d87fcd12'
                        key: {
                            name: 'x_acllens_report'
                            element: 'chart'
                            value: 'list'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'ad5bce2d09814f5582d96c8b6c9dfce2'
                        key: {
                            name: 'x_acllens_ai_conversation'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice_set'
                        id: 'af3c64821ea143e5bb44a0a19c5496d3'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'type'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'af443c3571214a7cb7568e18ea8bd139'
                        key: {
                            name: 'x_acllens_run_data'
                            element: 'payload'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: 'b1af5f52434e41b9860485da50fafd85'
                        key: {
                            name: 'x_acllens_dashboard'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'b60e50f9dcfc438fa0ae21a38ef4bbdb'
                        key: {
                            name: 'x_acllens_run'
                            element: 'filter'
                        }
                    },
                    {
                        table: 'sys_ws_query_parameter_map'
                        id: 'b9ed57cd4cb34358b45fbea30ee03a79'
                        key: {
                            web_service_operation: '1a3cfc1435694d068f2978896c6188ee'
                            web_service_query_parameter: '30a2e555144f442b855e1b7955c5564a'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'ba3aedea36884e5e99d098f978ef99fe'
                        key: {
                            name: 'x_acllens_run'
                            element: 'diff_count'
                        }
                    },
                    {
                        table: 'sys_choice_set'
                        id: 'ba9ac93eea2244f0969502ddd2492ba8'
                        key: {
                            name: 'x_acllens_run'
                            element: 'status'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'bd4d6a2b1a6b4f87aec25e0ae9e7d506'
                        key: {
                            sys_security_acl: 'e54aa2b0976f43ddb1668d71f3422178'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'bd6702d6b8b7475094f0ab481603297d'
                        key: {
                            name: 'x_acllens_ai_conversation'
                            element: 'user'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'beceead480064f7787fd77ba69fdb056'
                        key: {
                            sys_security_acl: 'e2eb4c4d3eb14b9dbd3ef352b7252da3'
                            sys_user_role: {
                                id: '7e2edc83c71f4b3191d59ff5fc5504b6'
                                key: {
                                    name: 'x_acllens.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'c093befa3a0f4920843afa9ab59754b6'
                        key: {
                            name: 'x_acllens_run_data'
                            element: 'run'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'c3da361600934beebb436f2e811f41f9'
                        key: {
                            name: 'x_acllens_ai_conversation'
                            element: 'message_count'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: 'c707ca1ba81d4fb08371653b38108e6c'
                        key: {
                            name: 'x_acllens_ai_provider'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'c8a29b5d688d43af9eb27863fee4a1d2'
                        key: {
                            sys_security_acl: 'f0cfb4b0340a43f290ff7e1aecdf60d5'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'c952b0ea7ea14cf3b0107c317d2c09a4'
                        key: {
                            name: 'x_acllens_dashboard'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'cb1ac9799b64420fa941c7e609d644fb'
                        key: {
                            name: 'x_acllens_run'
                            element: 'number'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'cd1ac16c52e34be09afd8c9e970532a7'
                        key: {
                            sys_security_acl: '79399a59c25743cb990e0bc0368ade63'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'cd2bda41ad2445c985d6067c484b96de'
                        key: {
                            name: 'x_acllens_run'
                            element: 'diff_count'
                            language: 'en'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: 'cdf8527c0a7142deab460f2871cfe619'
                        key: {
                            name: 'x_acllens_dashboard'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'cea77b0eae424db1b9ccd5016ad4a180'
                        key: {
                            name: 'x_acllens_report'
                            element: 'system'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'cf8ceb14484b406db39dff4450419425'
                        key: {
                            name: 'x_acllens_report'
                            element: 'owner'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'd04769fddd444c43a06f0def7f9dbc06'
                        key: {
                            name: 'x_acllens_run'
                            element: 'summary'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'd170173d69944c16abe2d416b800776c'
                        key: {
                            sys_security_acl: '9434ac6e2f044f8e8fc0c4e52ae97fb6'
                            sys_user_role: {
                                id: '7e2edc83c71f4b3191d59ff5fc5504b6'
                                key: {
                                    name: 'x_acllens.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'd28035332d24464e8e8450530e037696'
                        key: {
                            name: 'x_acllens_run'
                            element: 'table_count'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'd35fa4a452a14a3f89cbc71f007868cc'
                        key: {
                            name: 'x_acllens_ai_conversation'
                            element: 'run'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'd3d6a4a1b53c455f9dbad24ae4e6b1e6'
                        key: {
                            name: 'x_acllens_run'
                            element: 'archived'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'd4a138f326c84565a6d08749ce8050d5'
                        key: {
                            name: 'x_acllens_run'
                            element: 'original_run'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'd535cad24fca4c56aa7fc6a3a5a31b41'
                        key: {
                            sys_security_acl: '1b54958f144140fcb5e19e75e3fc911a'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_policy_action'
                        id: 'd5502f2eb9c64974b99de31f0cdb8a1a'
                        key: {
                            ui_policy: {
                                id: 'efba9cb7fef042aa9923cd1a2b8e7d54'
                                key: {
                                    table: 'x_acllens_ai_provider'
                                    short_description: 'Show only the fields used by the selected provider type'
                                }
                            }
                            field: 'max_tokens'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'd6907af9106b424fb147ae308f985bbf'
                        key: {
                            name: 'x_acllens_run'
                            element: 'table_count'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'd91c7180c1ab4bd18856e0c6eba4067b'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'active'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'dbf2d3b34e91463bb5d708ddfdd50e19'
                        key: {
                            name: 'x_acllens_report'
                            element: 'on_default'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'dc8f6341e73b496c982c155a8cb4d4e2'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'skill_input'
                            language: 'en'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: 'dd6525127691465c9cc6f8afad467ae4'
                        key: {
                            name: 'x_acllens_ai_message'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'de9ac6f0697f462e90ce11526fd87b3d'
                        key: {
                            name: 'x_acllens_run_data'
                            element: 'kind'
                            value: 'results'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'df507c4a6bd04651b44d5e94e25d5e37'
                        key: {
                            name: 'x_acllens_dashboard'
                            element: 'owner'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'e171204974e64ee8987f22c4239f1a18'
                        key: {
                            name: 'x_acllens_ai_message'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'e2f292aa958d4a56848216aaa3ac7e66'
                        key: {
                            sys_security_acl: 'c87f952d100d427a99488f8b0d73b278'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'e4783b02838c4181991172ce0c290d04'
                        key: {
                            name: 'x_acllens_run'
                            element: 'run_type'
                            value: 'compare'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'e49dedda66af4f16b2fb57b98d653b0c'
                        key: {
                            name: 'x_acllens_ai_message'
                            element: 'tools_used'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'e5bbfb19b56e406e84c81524db127286'
                        key: {
                            sys_security_acl: 'dddfeb56f6794a53946b73eb38e1da06'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'e6a230c381204aee90654ebf53f3e250'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'capability_id'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: 'e74415d376474a57a70e1a302b81f7b8'
                        key: {
                            name: 'x_acllens_ai_message'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'e7926a8e061144db8aa620de19739989'
                        key: {
                            name: 'x_acllens_run_data'
                            element: 'kind'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'e947102613244d65943bbffd56bd539a'
                        key: {
                            name: 'x_acllens_ai_conversation'
                            element: 'provider'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'eb4137cc36ec4c7183cddb1db8229fab'
                        key: {
                            name: 'x_acllens_report'
                            element: 'category'
                            value: 'comparison'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'ebc19bc550cc4fbcab9ac6e89f2ec009'
                        key: {
                            name: 'x_acllens_report'
                            element: 'order'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'ede83d730c854590a4ba900fb1ec5467'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'is_default'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'ef7d577754134ee4b718f2de7b7eb85b'
                        key: {
                            name: 'x_acllens_run_data'
                            element: 'seq'
                        }
                    },
                    {
                        table: 'sys_ui_policy'
                        id: 'efba9cb7fef042aa9923cd1a2b8e7d54'
                        key: {
                            table: 'x_acllens_ai_provider'
                            short_description: 'Show only the fields used by the selected provider type'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'f07d2fb66e59452ab2c3b9d7ee945fd9'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'order'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'f1e8dbf22f9b4315a887766a334b1bb9'
                        key: {
                            name: 'x_acllens_run'
                            element: 'name'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'f26834e93f5945c48ca18a82aa3009ac'
                        key: {
                            name: 'x_acllens_ai_conversation'
                            element: 'user'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'f303ba2b44984845a93a861fe7ca7df6'
                        key: {
                            name: 'x_acllens_run'
                            element: 'duration_ms'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'f33f2c34f507446290087464391cbcab'
                        key: {
                            name: 'x_acllens_report'
                            element: 'on_default'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'f389661dbb9a47acad000c03bebf047a'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'type'
                            value: 'now_assist'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'f41b95ef544e462e98b3d78167335dca'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'api_key'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'f715c7777c704d1ab457ed4d8c98ca38'
                        key: {
                            sys_security_acl: '5ba569c234bc4158af2bcfe072678b3e'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'f738c4cbc64f45888f94a36421089134'
                        key: {
                            name: 'x_acllens_ai_message'
                            element: 'role'
                            language: 'en'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: 'f9779c773c76497fb8bad5497de60492'
                        key: {
                            name: 'x_acllens_run_data'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'f9c1c2c16ad74f1c8fbcdc3086122173'
                        key: {
                            sys_security_acl: '20b80a6f8d92461fab3f41040125c2ae'
                            sys_user_role: {
                                id: '7e2edc83c71f4b3191d59ff5fc5504b6'
                                key: {
                                    name: 'x_acllens.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'fb81ea0b550c40a2a2baf38a7f90a5d2'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'type'
                            value: 'anthropic'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'fc03becd7b9c45388157f61ddb7771ad'
                        key: {
                            sys_security_acl: '3604c0a759524d9bb828d5b06017e7d5'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'fc3588b0a11440a8a8c9fcb16007e04e'
                        key: {
                            name: 'x_acllens_run_data'
                            element: 'kind'
                            value: 'drift'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'fc586f64386e4e9c924084adfc82d23d'
                        key: {
                            sys_security_acl: 'f83ad8e2fb6249eb98f92c28a25989fc'
                            sys_user_role: {
                                id: '43149c594d5a422ebdd87be3a3c4ed08'
                                key: {
                                    name: 'x_acllens.user'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_choice_set'
                        id: 'fda190e4742547c28a936ff4128fff77'
                        key: {
                            name: 'x_acllens_ai_message'
                            element: 'role'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'fe2d303407a34c018ac46ef52ea80b1e'
                        key: {
                            name: 'x_acllens_ai_provider'
                            element: 'notes'
                            language: 'en'
                        }
                    },
                ]
            }
        }
    }
}
