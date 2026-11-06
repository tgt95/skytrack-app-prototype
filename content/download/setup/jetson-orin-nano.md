# Flash a Yocto Image to Jetson Orin Nano NVMe

Run the commands on an Ubuntu laptop.

## 1. Extract the image

```text
mkdir -p ~/jetson-flash
cd ~/jetson-flash

tar -xzpf \
  /path/to/build/tmp/deploy/images/jetson-orin-nano-devkit-nvme/core-image-full-cmdline-jetson-orin-nano-devkit-nvme.tegraflash.tar.gz
```

## 2. Connect the Jetson

1. Install the NVMe SSD in the Jetson.
2. Connect the Jetson’s USB-C port to the laptop using a USB data cable.
3. Put the Jetson into **Force Recovery Mode**.

## 3. Verify USB detection

```text
lsusb | grep -i nvidia
```

Expected output — example:

```text
Bus 001 Device 005: ID 0955:7523 NVIDIA Corp. APX
```

`NVIDIA Corp. APX` indicates recovery mode. Bus, device numbers, and USB ID may vary.

## 4. Flash the image

From the extracted directory containing `initrd-flash`, run the provided command:

```text
sudo ./initrd-flash
```

## 5. Boot the Jetson

1. Wait for flashing to complete successfully.
2. Remove the Recovery jumper, if installed.
3. Restart the Jetson.

**Warning:** Flashing overwrites data on the target storage.
