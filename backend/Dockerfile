#######################################################
# Build the Spring Boot application with Maven
#######################################################
FROM maven:3.9.16-eclipse-temurin-21 AS build-env
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
FROM amazoncorretto:21.0.12-alpine3.24

#######################################################
# Setting up timezone
#######################################################
ENV TZ=Etc/GMT
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

#######################################################
# Setting up environment
#######################################################
ENV APP_CONFIG_TEMPLATE="/opt/config/application.tmpl"
ENV APP_CONFIG_LOCATION="/opt/config/application.yml"
ENV SPRING_CONFIG_LOCATION="file:/opt/config/application.yml"

ENV SERVICE="datacatalog-backend"
ENV LOG_LEVEL="INFO"
ENV FRAMEWORK_LOG_LEVEL="INFO"

WORKDIR /opt

# Install necessary utilities
RUN apk add --no-cache --upgrade libcrypto3 libssl3 curl

#######################################################
# Install dockerize (for config templating)
#######################################################
ENV DOCKERIZE_VERSION=v0.15.1
RUN wget https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && tar -C /usr/local/bin -xzvf dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && rm dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz

#######################################################
# Prepare the Spring Boot application files
#######################################################
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && install -d -o appuser -g appgroup /opt/config

COPY --chown=appuser:appgroup config/application.tmpl $APP_CONFIG_TEMPLATE
COPY --from=build-env --chown=appuser:appgroup /opt/code/target/datacatalog-0.0.1-SNAPSHOT.jar /usr/share/jars/

#######################################################
# Set up entrypoint and expose port
#######################################################
USER appuser

ENTRYPOINT ["sh", "-c", "dockerize -template $APP_CONFIG_TEMPLATE:$APP_CONFIG_LOCATION java -jar /usr/share/jars/datacatalog-0.0.1-SNAPSHOT.jar"]
EXPOSE 8090

#######################################################
# Healthcheck
#######################################################
HEALTHCHECK --start-period=60s CMD curl -f http://localhost:8090/services/actuator/health || exit 1
