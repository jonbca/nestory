# output "es_url" {
#     value = "${aws_elasticsearch_domain.nestory.endpoint}"
# }

output "db_arn" {
    value = "${aws_dynamodb_table.nest_reading_history.arn}"
}

output "db_name" {
    value = "${aws_dynamodb_table.nest_reading_history.name}"
}
