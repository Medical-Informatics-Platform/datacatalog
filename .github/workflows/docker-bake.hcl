variable "DOCKERHUB_ORG" {
  default = "hbpmip"
}

variable "APP" {
  default = "datacatalog"
}

variable "VERSION" {
  default = "dev"
}

group "default" {
  targets = ["backend", "frontend", "data_quality_tool"]
}

target "backend" {
  context = "./backend"
  dockerfile = "Dockerfile"
  tags = ["${DOCKERHUB_ORG}/${APP}_backend:${VERSION}"]
}

target "frontend" {
  context = "./frontend"
  dockerfile = "Dockerfile"
  tags = ["${DOCKERHUB_ORG}/${APP}_frontend:${VERSION}"]
}

target "data_quality_tool" {
  context = "./data_quality_tool"
  dockerfile = "Dockerfile"
  tags = ["${DOCKERHUB_ORG}/${APP}_data_quality_tool:${VERSION}"]
}
