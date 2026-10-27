# Builder image: compile and package the Spring Boot app
FROM maven:3.9.16-eclipse-temurin-25 AS build
WORKDIR /app

# Copy pom and download dependencies first (better cache)
COPY pom.xml ./
RUN mvn -B dependency:go-offline

# Copy sources and build the jar
COPY src ./src
RUN mvn -B package -DskipTests

# Runtime image: Java 25 LTS
FROM eclipse-temurin:25-jre
WORKDIR /app

# Copy the fat jar from the build stage
COPY --from=build /app/target/*.jar /app/app.jar

# Expose HTTPS port
EXPOSE 8443

# Default profile for containers
ENV SPRING_PROFILES_ACTIVE=docker

ENTRYPOINT ["java","-jar","/app/app.jar"]
