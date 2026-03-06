# Data Quality Tool Setup

This project provides a backend API for Excel and JSON conversion and validation.

## Prerequisites

- Docker

## Installation Instructions

### Step 1: Install Docker

#### Windows and macOS
- Download and install Docker Desktop from [Docker's official website](https://www.docker.com/products/docker-desktop).

#### Linux
- Follow the instructions on the [Docker website](https://docs.docker.com/engine/install/) to install Docker.

### Step 2: Clone the Repository

Clone this repository to your local machine:

```sh
git clone https://github.com/Medical-Informatics-Platform/datacatalog.git
cd datacatalog/data_quality_tool
```

### Step 3: Build and Run the Service

1. Build the image:

    ```sh
    docker build -t data-quality-tool .
    ```

2. Start the container:

    ```sh
    docker run --rm -p 8000:8000 data-quality-tool
    ```

### Step 4: Access the API

- The API will be available at [http://localhost:8000](http://localhost:8000).

### Stopping the Container

To stop the container, press `Ctrl+C` in the running terminal.

## Additional Information

- To rebuild the image after making changes, run `docker build -t data-quality-tool .` again.
- For shell access, run `docker run --rm -it data-quality-tool /bin/bash`.
