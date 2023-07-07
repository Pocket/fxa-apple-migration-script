# Useful queries

Query to generate a CSV to hand to FxA

```sql
SELECT apple_migration.transfer_sub,
       IFNULL(users.email, '')                                                 AS email,
       IFNULL(ufa.firefox_uid, '')                                             as fxa_user_id,
       IFNULL(GROUP_CONCAT(us.username ORDER BY us.user_id SEPARATOR ':'), '') AS alternate_emails
FROM apple_migration
         JOIN users on apple_migration.user_id = users.user_id
         left outer join user_firefox_account ufa on apple_migration.user_id = ufa.user_id
         left outer JOIN (SELECT username,
                                 user_id
                          FROM users_services
                          WHERE confirmed = true
                            and service_id = 2) us ON apple_migration.user_id = us.user_id
GROUP BY apple_migration.user_id;
```

Query to get users that we don't have a transfer sub for.
Note look for the users creation date (birth) to determine the starting point of ids to generate subs for.
Anything before a continuous row of numbers are users that deleted their apple account and we can't generate a sub for

```sql
SELECT * from readitla_auth.user_providers
    JOIN readitla_auth.users on user_providers.user_id = users.id
    join `readitla_ril-tmp`.users on readitla_auth.users.external_key = `readitla_ril-tmp`.users.auth_user_id
    left join apple_migration on apple_migration.user_id = `readitla_ril-tmp`.users.user_id
where apple_migration.user_id IS NULL
order by user_providers.id desc;
```
