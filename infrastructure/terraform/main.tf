terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "mysetlist-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
    dynamodb_table = "terraform-state-lock"
  }
}

# Variables
variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "mysetlist.app"
}

variable "vercel_api_token" {
  description = "Vercel API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
}

variable "supabase_anon_key" {
  description = "Supabase anonymous key"
  type        = string
  sensitive   = true
}

variable "sentry_dsn" {
  description = "Sentry DSN"
  type        = string
  sensitive   = true
}

# Providers configuration
provider "vercel" {
  api_token = var.vercel_api_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "aws" {
  region = "us-east-1"
}

provider "github" {
  # Token will be read from GITHUB_TOKEN env var
}

# Cloudflare Zone
data "cloudflare_zone" "main" {
  name = var.domain_name
}

# Vercel Project
resource "vercel_project" "mysetlist" {
  name      = "mysetlist-${var.environment}"
  framework = "nextjs"
  
  git_repository = {
    type = "github"
    repo = "mysetlist/mysetlist-app"
  }
  
  build_command    = "pnpm build"
  output_directory = "apps/web/.next"
  install_command  = "pnpm install --frozen-lockfile"
  
  environment = [
    {
      key    = "NEXT_PUBLIC_SUPABASE_URL"
      value  = var.supabase_url
      target = ["production", "preview"]
    },
    {
      key    = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      value  = var.supabase_anon_key
      target = ["production", "preview"]
    },
    {
      key    = "NEXT_PUBLIC_SENTRY_DSN"
      value  = var.sentry_dsn
      target = ["production", "preview"]
    },
    {
      key    = "NEXT_PUBLIC_APP_URL"
      value  = "https://${var.domain_name}"
      target = ["production"]
    }
  ]
}

# Vercel Domain
resource "vercel_project_domain" "main" {
  project_id = vercel_project.mysetlist.id
  domain     = var.domain_name
}

resource "vercel_project_domain" "www" {
  project_id = vercel_project.mysetlist.id
  domain     = "www.${var.domain_name}"
  redirect   = var.domain_name
}

# Cloudflare DNS Records
resource "cloudflare_record" "root" {
  zone_id = data.cloudflare_zone.main.id
  name    = "@"
  value   = "cname.vercel-dns.com"
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

resource "cloudflare_record" "www" {
  zone_id = data.cloudflare_zone.main.id
  name    = "www"
  value   = "cname.vercel-dns.com"
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

# Cloudflare Security Settings
resource "cloudflare_zone_settings_override" "security" {
  zone_id = data.cloudflare_zone.main.id
  
  settings {
    ssl                      = "strict"
    always_use_https         = "on"
    min_tls_version          = "1.2"
    opportunistic_encryption = "on"
    tls_1_3                  = "on"
    automatic_https_rewrites = "on"
    security_level           = "medium"
    brotli                   = "on"
    challenge_ttl            = 1800
    privacy_pass             = "on"
    
    security_header {
      enabled            = true
      preload            = true
      include_subdomains = true
      max_age            = 31536000
      nosniff            = true
    }
  }
}

# Cloudflare Page Rules
resource "cloudflare_page_rule" "cache_static" {
  zone_id  = data.cloudflare_zone.main.id
  target   = "${var.domain_name}/_next/static/*"
  priority = 1
  
  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 31536000
    browser_cache_ttl = 31536000
  }
}

resource "cloudflare_page_rule" "cache_images" {
  zone_id  = data.cloudflare_zone.main.id
  target   = "${var.domain_name}/images/*"
  priority = 2
  
  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 604800
    browser_cache_ttl = 86400
    polish = "lossless"
    mirage = "on"
  }
}

# Cloudflare Rate Limiting
resource "cloudflare_rate_limit" "api" {
  zone_id   = data.cloudflare_zone.main.id
  threshold = 50
  period    = 60
  match {
    request {
      url_pattern = "${var.domain_name}/api/*"
    }
  }
  action {
    mode    = "challenge"
    timeout = 3600
  }
}

# Cloudflare WAF Rules
resource "cloudflare_ruleset" "waf" {
  zone_id = data.cloudflare_zone.main.id
  name    = "MySetlist WAF Rules"
  kind    = "zone"
  phase   = "http_request_firewall_custom"
  
  rules {
    action = "block"
    expression = "(cf.threat_score > 30 and not cf.bot_management.verified_bot)"
    description = "Block high threat score non-verified bots"
  }
  
  rules {
    action = "challenge"
    expression = "(http.request.uri.path contains \"/api/admin\" and not ip.src in {10.0.0.0/8})"
    description = "Challenge admin API access from non-internal IPs"
  }
}

# AWS S3 Bucket for Backups
resource "aws_s3_bucket" "backups" {
  bucket = "mysetlist-backups-${var.environment}"
  
  tags = {
    Environment = var.environment
    Purpose     = "database-backups"
  }
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  
  rule {
    id     = "delete-old-backups"
    status = "Enabled"
    
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    expiration {
      days = 365
    }
  }
}

# AWS CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "mysetlist-${var.environment}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "50"
  alarm_description   = "This metric monitors error rate"
  treat_missing_data  = "notBreaching"
  
  alarm_actions = [aws_sns_topic.alerts.arn]
}

# AWS SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "mysetlist-${var.environment}-alerts"
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "ops@mysetlist.app"
}

# GitHub Repository Settings
resource "github_branch_protection" "main" {
  repository_id = "mysetlist-app"
  pattern       = "main"
  
  required_status_checks {
    strict   = true
    contexts = ["CI Pipeline", "Security Scan", "Performance Tests"]
  }
  
  required_pull_request_reviews {
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = true
    required_approving_review_count = 1
  }
  
  enforce_admins = false
  allows_deletions = false
  allows_force_pushes = false
}

# Outputs
output "vercel_url" {
  value = vercel_project.mysetlist.domains[0]
}

output "cloudflare_zone_id" {
  value = data.cloudflare_zone.main.id
}

output "backup_bucket" {
  value = aws_s3_bucket.backups.id
}

output "sns_topic_arn" {
  value = aws_sns_topic.alerts.arn
}