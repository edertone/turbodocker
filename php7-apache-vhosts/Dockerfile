# note that this is a DEBIAN image, so configurations and folders are specific to this distribution
FROM php:7.4.16-apache

# Enable required apache modules: SSL, mod_rewrite, mod_expires, mod_headers, mod_deflate
RUN a2enmod ssl && a2enmod rewrite && a2enmod expires && a2enmod headers && a2enmod deflate

# Install php op cache
RUN docker-php-ext-configure opcache --enable-opcache \
    && docker-php-ext-install opcache
	
# Create and clean all the required folders on the docker image
RUN mkdir -p /var/www/virtualhosts
RUN mkdir -p /var/www/virtualhosts/.logs
RUN mkdir -p /var/www/certificates
RUN rm /etc/apache2/sites-available/*

# Create a volume that will point to the local machine virtual hosts data
VOLUME /var/www/virtualhosts

#Copy all local files to their respective docker image locations
COPY apache/global-custom.conf /etc/apache2/conf-available

# Generate self signed localhost certificate using openssl
RUN openssl genrsa -des3 -passout pass:1234 -out server.pass.key 2048 && \
    openssl rsa -passin pass:1234 -in server.pass.key -out /var/www/certificates/localhost.key && \
    rm server.pass.key && \
    openssl req -new -key /var/www/certificates/localhost.key -out /var/www/certificates/localhost.csr \
        -subj "/C=ES/ST=localhost/L=localhost/O=localhost/OU=IT Department/CN=localhost" && \
    openssl x509 -req -days 365 -in /var/www/certificates/localhost.csr -signkey /var/www/certificates/localhost.key -out /var/www/certificates/localhost.crt

# Enable the custom global confs
RUN a2enconf global-custom.conf

# /usr/local/etc/php/conf.d folder contains the php.ini configuration files that will be loaded in alphabetical order.
# First we will copy the production .ini template to this folder, and then add our local custom ini to override our custom values
# We can see the loaded ini files if we call phpinfo() on a php file, by searching: Loaded Configuration File
RUN mv /usr/local/etc/php/php.ini-production /usr/local/etc/php/conf.d/php.ini
COPY php/php-custom.ini /usr/local/etc/php/conf.d/php2.ini

# Copy the startup script that will dinamically initialize the virtual hosts and start apache
COPY scripts/startup.sh /usr/local/bin
RUN chmod +x /usr/local/bin/startup.sh

# Open http and https ports
EXPOSE 80 443

CMD ["/usr/local/bin/startup.sh"]