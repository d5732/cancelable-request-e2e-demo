FROM postgres:latest

# Volume for database persistence
VOLUME /var/lib/postgresql/data

CMD ["postgres"]
