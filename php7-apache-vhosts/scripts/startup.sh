#!/bin/bash

# Stop apache server in case it was previously running
/etc/init.d/apache2 stop;

# Set apache (www-data) as the owner with write permissions to the virtualhosts root folder (not recursive).
# To avoid possible errors when accessing and modifying the virtualhosts folder via ssh, make sure that any new file or folder
# is always owned by www-data:www-data
chown www-data:www-data /var/www/virtualhosts
chmod g+w /var/www/virtualhosts

# Search for all the virtual hosts configurations and copy them to the sites-available folder
find /var/www/virtualhosts -not -path '*/\.*' -name "*.conf" -exec cp {} /etc/apache2/sites-available \;

# Enable all the virtual hosts on the sites-available folder
a2ensite *;

# Verify that the apache config is correct
apachectl configtest;

echo 'Start apache server';

#This is the entry point for the base docker image and must be called after doing our things
apache2-foreground;