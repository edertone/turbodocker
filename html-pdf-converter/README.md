# HTML to PDF web service

This is a Dockerized microservice utility for converting HTML to PDF using Chromium. It generates PDF files that are rendered exactly the same as how the browser renders the HTML source.

The container works as a web service that expects html raw data and returns the equivalent pdf rendered using the chromium engine. All the conversion process and temporary data is handled internally by the docker image, so the only requirement is to have enough HDD space for the docker container to run.

All temporary files are automatically cleaned, so no increase in storage should happen during extended usage of this microservice.

## Endpoints:

The service exposes two HTTP endpoints at the 5001 port:

    •  /convert-to-binary: Returns the PDF as binary file (Recommended for performance)
    •  /convert-to-base64: Returns the PDF as a base64 string

To generate a pdf, send a POST request with a JSON payload containing the HTML string:

```
{
  "html": "<your html code>"
}
```

The service will directly return the PDF data with the selected format.

## Examples

### With php:

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
