# Instance settings before the port

Read-only snapshot taken 2026-11-06, before the fixes from the Opus 5 review were copied into this repo. It is the "before" side of the comparison, and the list to restore by hand if a rollback falls short. The scope is written as `x_acllens`; the code at this point is the `pre-port-checkpoint` tag.

## Application

1 rows.

| version | runtime_access_tracking | restrict_table_access |
|---|---|---|
| 1.4.0 | permissive | false |

## Tables

7 rows.

| name | access | read_access | create_access | update_access | alter_access | delete_access |
|---|---|---|---|---|---|---|
| x_acllens_ai_conversation | public | true | false | false | false | false |
| x_acllens_ai_message | public | true | false | false | false | false |
| x_acllens_ai_provider | public | true | false | false | false | false |
| x_acllens_dashboard | public | true | false | false | false | false |
| x_acllens_report | public | true | false | false | false | false |
| x_acllens_run | public | true | false | false | false | false |
| x_acllens_run_data | public | true | false | false | false | false |

## ACLs

34 rows.

| name | operation | active | admin_overrides | script | sys_id |
|---|---|---|---|---|---|
| x_acllens_ai_conversation | delete | true | true | answer = current.user == gs.getUserID(); | 5ba569c234bc4158af2bcfe072678b3e |
| x_acllens_ai_conversation | read | true | true | answer = current.user == gs.getUserID(); | 77bcf1f0a31a41f09d6f285e7e5b056b |
| x_acllens_ai_conversation.* | read | true | true | answer = current.user == gs.getUserID(); | 1f8ce15c9ef5478f81200ebcfddfe908 |
| x_acllens_ai_message | read | true | true | answer = current.conversation.user == gs.getUserID(); | 5bf992bb05af41e092c79547b304a35d |
| x_acllens_ai_message.* | read | true | true | answer = current.conversation.user == gs.getUserID(); | bed283885b5846f2942863286d85167a |
| x_acllens_ai_provider | create | true | true | — | e050f47ab1884298a3a1c29f6022ee1c |
| x_acllens_ai_provider | delete | true | true | — | 41fad204ca424f5d9f48c4e9288ea3eb |
| x_acllens_ai_provider | read | true | true | — | d66e774684b84195b6e57bd6abeb11f4 |
| x_acllens_ai_provider | write | true | true | — | 14ba43d9c6914d9da0b4a9570e161bbe |
| x_acllens_ai_provider.* | read | true | true | — | 9434ac6e2f044f8e8fc0c4e52ae97fb6 |
| x_acllens_ai_provider.* | write | true | true | — | 536c3aa8ae3f488a8951b6483ff29411 |
| x_acllens_dashboard | create | true | true | — | 4e51fbb28faa405eb2c379111fa3e197 |
| x_acllens_dashboard | delete | true | true | answer = current.owner == gs.getUserID(); | 94dcf0b2b9ac4ce18e8c4675c6807e84 |
| x_acllens_dashboard | read | true | true | answer = current.owner == gs.getUserID(); | e54aa2b0976f43ddb1668d71f3422178 |
| x_acllens_dashboard | write | true | true | answer = current.owner == gs.getUserID(); | 35b0100da1b342f88cf48a976588f347 |
| x_acllens_dashboard.* | read | true | true | answer = current.owner == gs.getUserID(); | fe082e663dd742c3b5878e498df7c49b |
| x_acllens_dashboard.* | write | true | true | answer = current.owner == gs.getUserID(); | f83ad8e2fb6249eb98f92c28a25989fc |
| x_acllens_report | create | true | true | — | 1b54958f144140fcb5e19e75e3fc911a |
| x_acllens_report | delete | true | true | answer = current.system != true && (current.owner == gs.getUserID() \|\| gs.hasRole("x_acllens.admin")); | f0cfb4b0340a43f290ff7e1aecdf60d5 |
| x_acllens_report | read | true | true | answer = current.system == true \|\| current.shared == true \|\| current.owner == gs.getUserID() \|\| gs.hasRole("x_acllens.admin"); | dddfeb56f6794a53946b73eb38e1da06 |
| x_acllens_report | write | true | true | answer = current.system != true && (current.owner == gs.getUserID() \|\| gs.hasRole("x_acllens.admin")); | 79399a59c25743cb990e0bc0368ade63 |
| x_acllens_report.* | read | true | true | answer = current.system == true \|\| current.shared == true \|\| current.owner == gs.getUserID() \|\| gs.hasRole("x_acllens.admin"); | 680818f6b19f4cf7a0858aeb4b8a667f |
| x_acllens_report.* | write | true | true | answer = current.system != true && (current.owner == gs.getUserID() \|\| gs.hasRole("x_acllens.admin")); | c87f952d100d427a99488f8b0d73b278 |
| x_acllens_report.shared | write | true | true | — | 04127795d7814941947b1db3943dae73 |
| x_acllens_run | create | true | true | — | 208f63fc7f9947dfa26041388e4e554b |
| x_acllens_run | delete | true | true | — | e2eb4c4d3eb14b9dbd3ef352b7252da3 |
| x_acllens_run | read | true | true | answer = current.run_by == gs.getUserID() \|\| gs.hasRole("x_acllens.admin"); | 3604c0a759524d9bb828d5b06017e7d5 |
| x_acllens_run | write | true | true | — | 20b80a6f8d92461fab3f41040125c2ae |
| x_acllens_run.* | read | true | true | answer = current.run_by == gs.getUserID() \|\| gs.hasRole("x_acllens.admin"); | 03847742fb81430c9d9b0bd37767620e |
| x_acllens_run.* | write | true | true | — | b1573a35e0784a95a32e23e206274d5f |
| x_acllens_run_data | create | true | true | — | 1f3bf648c09e451da19ff4f6b6e35040 |
| x_acllens_run_data | delete | true | true | — | 2325f069783b43069c0134ec23627c72 |
| x_acllens_run_data | read | true | true | answer = current.run.run_by == gs.getUserID() \|\| gs.hasRole("x_acllens.admin"); | d350ff8e023b4636944b714f734b676c |
| x_acllens_run_data.* | read | true | true | answer = current.run.run_by == gs.getUserID() \|\| gs.hasRole("x_acllens.admin"); | 6a7e673629c243d8a145954993002902 |

## Mandatory columns

15 rows.

| name | element |
|---|---|
| x_acllens_ai_conversation | user |
| x_acllens_ai_message | conversation |
| x_acllens_ai_message | role |
| x_acllens_ai_message | seq |
| x_acllens_ai_provider | name |
| x_acllens_ai_provider | type |
| x_acllens_dashboard | owner |
| x_acllens_report | measure |
| x_acllens_report | name |
| x_acllens_run | run_by |
| x_acllens_run | run_type |
| x_acllens_run | status |
| x_acllens_run_data | kind |
| x_acllens_run_data | run |
| x_acllens_run_data | seq |

## Audited tables and columns

1 rows.

| name | element |
|---|---|
| x_acllens_ai_provider | — |

## Indexes

6 rows.

| logical_table_name | columns | sys_id |
|---|---|---|
| x_acllens_ai_message | conversation, seq | 029dc2d2eb174e5a8f4dc70324e039e2 |
| x_acllens_report | system, shared | f8c1fdb3173d414ebdb19f5e4a131e80 |
| x_acllens_run | archived, sys_created_on | 07a95b5261b440c086b32a51344a6965 |
| x_acllens_run | status | c00a9ec2d55c45868f92a19a69ef1dca |
| x_acllens_run_data | cache_key | 54318907c9204a2aafad160ce62c07b4 |
| x_acllens_run_data | run, seq | b6f20e52d4b042478809779fe88f5708 |

## Data policies

2 rows.

| short_description | model_table | conditions | active | enforce_ui | apply_import_set | apply_soap | sys_id |
|---|---|---|---|---|---|---|---|
| Require an API key for key-based AI providers | x_acllens_ai_provider | typeINanthropic,openai_compatible,azure_openai | true | true | true | true | df12577c689b4b3cada0d8f8df4a51ef |
| Require an endpoint for Azure and OpenAI-compatible providers | x_acllens_ai_provider | typeINopenai_compatible,azure_openai | true | true | true | true | 4a05b164fd334800a2d3b8d58a874dc7 |

## Data policy rules

2 rows.

| sys_data_policy | field | mandatory | disabled |
|---|---|---|---|
| df12577c689b4b3cada0d8f8df4a51ef | api_key | true | ignore |
| 4a05b164fd334800a2d3b8d58a874dc7 | endpoint | true | ignore |

## Roles

2 rows.

| name | can_delegate | grantable | elevated_privilege |
|---|---|---|---|
| x_acllens.admin | true | true | false |
| x_acllens.user | true | true | false |

## Menu modules

8 rows.

| title | link_type | order | roles | active |
|---|---|---|---|---|
| Access Workspace | DIRECT | 100 | x_acllens.user | true |
| Reporting Dashboard | DIRECT | 150 | x_acllens.user | true |
| Run Records | LIST | 180 | x_acllens.admin,admin | true |
| Run History | DIRECT | 200 | x_acllens.user | true |
| Configuration | SEPARATOR | 1000 | x_acllens.admin,admin | true |
| Properties | DIRECT | 1100 | x_acllens.admin,admin | true |
| AI Providers | LIST | 1150 | x_acllens.admin,admin | true |
| MCP Server | DIRECT | 1200 | x_acllens.admin,admin | true |

## Properties

7 rows.

| name | value | type |
|---|---|---|
| x_acllens.history.enabled | true | boolean |
| x_acllens.history.retention.action | delete | choicelist |
| x_acllens.history.retention.days | 90 | integer |
| x_acllens.history.retention.enabled | false | boolean |
| x_acllens.mcp.enabled | false | boolean |
| x_acllens.run.max_result_mb | 256 | integer |
| x_acllens.ui.instance_theme | false | boolean |

## Cross-scope privileges

58 rows.

| target_name | operation | status |
|---|---|---|
| Glide API: properties | execute | allowed |
| Glide API: table metadata | execute | allowed |
| Glide API: user roles and groups | execute | allowed |
| GlideRecord.insert | execute | allowed |
| GlideRecord.setValue | execute | allowed |
| GlideRecord.update | execute | allowed |
| GlideRecordSecure.getValue | execute | allowed |
| GlideSysAttachment.write | execute | allowed |
| OneExtendUtil | execute | allowed |
| RESTAPIRequest | execute | allowed |
| RESTAPIRequestBody | execute | allowed |
| ScopedGlideElement | execute | allowed |
| ScriptableRESTMessageClient.execute | execute | allowed |
| ScriptableRESTMessageClient.setEndpoint | execute | allowed |
| ScriptableRESTMessageClient.setHttpMethod | execute | allowed |
| ScriptableRESTMessageClient.setHttpTimeout | execute | allowed |
| ScriptableRESTMessageClient.setRequestBody | execute | allowed |
| ScriptableRESTMessageClient.setRequestHeader | execute | allowed |
| ScriptableRESTResponse.getBody | execute | allowed |
| ScriptableRESTResponse.getStatusCode | execute | allowed |
| ScriptableServiceResultBuilder.getStreamWriter | execute | allowed |
| ScriptableServiceResultBuilder.setBody | execute | allowed |
| ScriptableServiceResultBuilder.setContentType | execute | allowed |
| ScriptableServiceResultBuilder.setStatus | execute | allowed |
| ScriptableServiceResultStreamWriter.writeString | execute | allowed |
| http_body_auth | read | allowed |
| http_key_auth | read | allowed |
| inbound_auth_profile | read | allowed |
| oauth_entity | read | allowed |
| oauth_entity_auth_scope_mapping | read | allowed |
| std_http_auth | read | allowed |
| sys_api_access_policy | read | allowed |
| sys_api_access_scope | read | allowed |
| sys_auth_profile_mapping | read | allowed |
| sys_auth_scope | read | allowed |
| sys_db_object | read | allowed |
| sys_dictionary | read | allowed |
| sys_group_has_role | read | allowed |
| sys_metadata | read | allowed |
| sys_one_extend_capability | read | allowed |
| sys_properties | read | allowed |
| sys_scope | read | allowed |
| sys_security_acl | read | allowed |
| sys_security_acl_role | read | allowed |
| sys_security_attribute | read | allowed |
| sys_security_data_filter | read | allowed |
| sys_security_machine_identity_access_control | read | allowed |
| sys_security_operation | read | allowed |
| sys_security_type | read | allowed |
| sys_user | read | allowed |
| sys_user_group | read | allowed |
| sys_user_has_role | read | allowed |
| sys_user_role | read | allowed |
| sys_user_role_contains | read | allowed |
| sys_ux_theme | read | allowed |
| sys_ws_definition | read | allowed |
| sys_ws_operation | read | allowed |
| sys_ws_version | read | allowed |
