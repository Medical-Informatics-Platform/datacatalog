#######################################################
# Build the Spring Boot application with Maven
#######################################################
# Base images are pinned by digest; Dependabot bumps the digest when the tag is rebuilt.
FROM maven:3.9-eclipse-temurin-26@sha256:b2c1ad85954592f9928e84327c65201f308ad9b5d8ed7d5b823717c97bf23fbb AS build-env
LABEL maintainer="Kostas Filippopolitis <kfilippopolitis@athenarc.gr>"

# Define build environment variables
ENV CODE_PATH="/opt/code"
WORKDIR $CODE_PATH

# Copy the Maven build files and perform a dependency resolution
COPY pom.xml $CODE_PATH
RUN mvn dependency:go-offline

# Copy the source code and build the JAR
COPY src/ $CODE_PATH/src
RUN mvn clean package -DskipTests

#######################################################
# Setup the runtime container
#######################################################
FROM amazoncorretto:21.0.12-alpine3.24@sha256:d5a42afb372d2bf5d937d7e6fb65b39c21b62a3f2af3cbcef46848a2f8364c6f

#######################################################
# Setting up timezone
#######################################################
ENV TZ=Etc/GMT
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

#######################################################
# Setting up environment
#######################################################
ENV SPRING_CONFIG_LOCATION="file:/opt/config/application.yml"

ENV SERVICE="datacatalog-backend"
ENV LOG_LEVEL="INFO"
ENV FRAMEWORK_LOG_LEVEL="INFO"

WORKDIR /opt

# Install necessary utilities. Versions come from the base image's Alpine
# release; pinning them would break the build whenever Alpine ships a fix.
# hadolint ignore=DL3018
RUN apk add --no-cache --upgrade libcrypto3 libssl3 curl

#######################################################
# Prepare the Spring Boot application files
#######################################################
RUN addgroup -S appgroup && adduser -S -u 1001 appuser -G appgroup

COPY config/application.yml /opt/config/application.yml
COPY --from=build-env --chown=appuser:appgroup /opt/code/target/datacatalog-0.0.1-SNAPSHOT.jar /usr/share/jars/

#######################################################
# Set up entrypoint and expose port
#######################################################
USER 1001

ENTRYPOINT ["java", "-jar", "/usr/share/jars/datacatalog-0.0.1-SNAPSHOT.jar"]
EXPOSE 8090

#######################################################
# Healthcheck
#######################################################
HEALTHCHECK --start-period=60s CMD ["sh", "-c", "curl -f http://localhost:8090/services/actuator/health || exit 1"]
