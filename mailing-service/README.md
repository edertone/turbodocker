# Translation Microservice

This Dockerized microservice allows sending emails via HTTP API endpoints on port 5003.

It also allows us to catch the emails for development puroses

## Docker image configuration

# TODO: Local Email Catcher for Development
  mailpit:
    image: axllent/mailpit
    container_name: mailpit
    ports:
      - "8025:8025" # Web UI to view emails (http://localhost:8025)
      - "1025:1025" # SMTP port for your app to send emails to