# HTML to PDF web service

This is a Dockerized utility for converting HTML to PDF using Chromium through an http web service

## Endpoints:

The service exposes two HTTP endpoints at the 5001 port:

    •  /convert-to-base64: Returns the PDF as a base64 string
    •  /convert-to-binary: Returns the PDF as binary file (Recommended for performance)

To generate a pdf, send a POST request with a JSON payload containing the HTML string:

```
{
  "html": "<your html code>"
}
```

The service will return the pdf data with the appropiate format.

Example with php:

```
// Call to the HTML to PDF conversion microservice
$ch = curl_init('http://html-pdf-converter:5001/convert-to-base64');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['html' => $report]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$pdf = curl_exec($ch);

if ($pdf === false) {
    $errorMsg = curl_error($ch);
    curl_close($ch);
    return $errorMsg;
}

curl_close($ch);

return $pdf;
```
