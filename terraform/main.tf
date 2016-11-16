provider "aws" {
    region = "us-east-1"
}

variable "lambda_name" {
    type = "string"
    default = "fetch_nest_data"
}

variable "upload_file" {
    type = "string"
    default = "../package.zip"
}

data "aws_caller_identity" "current" {

}

resource "aws_elasticsearch_domain" "nestory" {
    domain_name = "nestory"
    elasticsearch_version = "2.3"

    access_policies = <<CONFIG
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": "es:*",
            "Principal": "*",
            "Effect": "Allow",
            "Condition": {
                "IpAddress": {"aws:SourceIp": ["2.25.112.233"]}
            }
        }
    ]
}
CONFIG
    snapshot_options {
        automated_snapshot_start_hour = 20
    }

    ebs_options {
        ebs_enabled = true
        volume_type = "standard"
        volume_size = 10
    }

    cluster_config {
        instance_type = "t2.micro.elasticsearch"
        instance_count = 1
    }
}

data "aws_iam_policy_document" "lambda_es_policy" {
    statement {
        actions = [
            "es:ESHttpPost"
        ]
        resources = ["${aws_elasticsearch_domain.nestory.arn}/*"]
    }
    statement {
        actions = [
            "logs:CreateLogGroup"
        ]
        resources = ["arn:aws:logs:us-east-1:${data.aws_caller_identity.current.account_id}:*"]
    }
    statement {
        actions = [
            "logs:CreateLogStream",
            "logs:PutLogEvents"
        ],
        resources = ["arn:aws:logs:us-east-1:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.lambda_name}:*"]
    }
}

resource aws_iam_role "lambda_es_role" {
    name = "lambda_role"
    assume_role_policy = <<CONFIG
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
CONFIG
}

resource aws_iam_role_policy "lambda_es_role_policy" {
    name = "lambda_es_role_policy"
    role = "${aws_iam_role.lambda_es_role.id}"
    policy = "${data.aws_iam_policy_document.lambda_es_policy.json}"
}

resource aws_lambda_function "fetch_nest_data" {
    function_name = "${var.lambda_name}"
    role = "${aws_iam_role.lambda_es_role.arn}"
    runtime = "nodejs4.3"
    handler = "index.handler"
    filename = "${var.upload_file}"
    source_code_hash = "${base64sha256(file(var.upload_file))}"
}
